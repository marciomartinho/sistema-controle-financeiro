# app_routes/lancamentos_routes.py

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from app import db
from models import Conta, Categoria, Subcategoria, Lancamento, Recorrencia, TransferenciaGrupo

lancamentos_bp = Blueprint(
    'lancamentos_bp', __name__,
    template_folder='../templates'
)

@lancamentos_bp.route('/lancamentos', methods=['GET', 'POST'])
def gerenciar_lancamentos():
    if request.method == 'POST':
        tipo_lancamento = request.form.get('tipo_lancamento')
        
        if tipo_lancamento in ['Receita', 'Despesa']:
            # ... (Lógica de Receita/Despesa permanece a mesma) ...
            descricao = request.form.get('descricao')
            valor_total = Decimal(request.form.get('valor'))
            data_vencimento_str = request.form.get('data_vencimento')
            data_vencimento = datetime.strptime(data_vencimento_str, '%Y-%m-%d').date()
            subcategoria_id = request.form.get('subcategoria_id')
            conta_id = request.form.get('conta_id')
            recorrencia_tipo = request.form.get('recorrencia_tipo')

            if recorrencia_tipo == 'unica':
                novo_lancamento = Lancamento(descricao=descricao, valor=float(valor_total), tipo=tipo_lancamento, data_vencimento=data_vencimento, subcategoria_id=subcategoria_id, conta_id=conta_id)
                db.session.add(novo_lancamento)
                flash('Lançamento único adicionado com sucesso!', 'success')

            elif recorrencia_tipo == 'parcelada':
                total_parcelas = int(request.form.get('num_parcelas', 2))
                frequencia = request.form.get('frequencia', 'Mensal')
                tipo_recorrencia = 'Parcelada'
                valor_total_centavos = int(valor_total * 100)
                valor_parcela_centavos = valor_total_centavos // total_parcelas
                resto_centavos = valor_total_centavos % total_parcelas

                nova_recorrencia = Recorrencia(descricao_base=descricao, tipo=tipo_recorrencia, total_parcelas=total_parcelas, frequencia=frequencia)
                db.session.add(nova_recorrencia)
                db.session.flush()

                for i in range(total_parcelas):
                    valor_parcela_atual_centavos = valor_parcela_centavos
                    if i == total_parcelas - 1:
                        valor_parcela_atual_centavos += resto_centavos
                    valor_parcela_atual = float(Decimal(valor_parcela_atual_centavos) / 100)

                    if frequencia == 'Semanal': vencimento_parcela = data_vencimento + relativedelta(weeks=i)
                    elif frequencia == 'Quinzenal': vencimento_parcela = data_vencimento + relativedelta(days=i*15)
                    elif frequencia == 'Anual': vencimento_parcela = data_vencimento + relativedelta(years=i)
                    else: vencimento_parcela = data_vencimento + relativedelta(months=i)
                    
                    descricao_parcela = f"{descricao} ({i+1}/{total_parcelas})"
                    
                    lancamento_rec = Lancamento(descricao=descricao_parcela, valor=valor_parcela_atual, tipo=tipo_lancamento, data_vencimento=vencimento_parcela, subcategoria_id=subcategoria_id, conta_id=conta_id, recorrencia_id=nova_recorrencia.id)
                    db.session.add(lancamento_rec)

                flash(f'{tipo_recorrencia} ({frequencia}) adicionada com sucesso!', 'success')
                
            elif recorrencia_tipo == 'fixa':
                frequencia = 'Mensal'
                total_meses = 60
                nova_recorrencia = Recorrencia(descricao_base=descricao, tipo='Fixa', total_parcelas=total_meses, frequencia=frequencia)
                db.session.add(nova_recorrencia)
                db.session.flush()

                for i in range(total_meses):
                    vencimento_mes = data_vencimento + relativedelta(months=i)
                    lancamento_fixo = Lancamento(descricao=descricao, valor=float(valor_total), tipo=tipo_lancamento, data_vencimento=vencimento_mes, subcategoria_id=subcategoria_id, conta_id=conta_id, recorrencia_id=nova_recorrencia.id)
                    db.session.add(lancamento_fixo)
                flash(f'Lançamento fixo criado para os próximos {total_meses} meses!', 'success')
        
        elif tipo_lancamento == 'Transferencia':
            descricao = request.form.get('descricao')
            valor = float(request.form.get('valor'))
            data_str = request.form.get('data_vencimento')
            data = datetime.strptime(data_str, '%Y-%m-%d').date()
            conta_origem_id = request.form.get('conta_origem_id')
            conta_destino_id = request.form.get('conta_destino_id')

            if not all([descricao, valor, data_str, conta_origem_id, conta_destino_id]):
                flash('Todos os campos da transferência são obrigatórios.', 'danger')
                return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))

            if conta_origem_id == conta_destino_id:
                flash('A conta de origem e destino não podem ser a mesma.', 'danger')
                return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))
            
            # REMOVEMOS A BUSCA PELA SUBCATEGORIA "TRANSFERÊNCIA"

            grupo = TransferenciaGrupo()
            db.session.add(grupo)
            db.session.flush()

            conta_origem_nome = Conta.query.get(conta_origem_id).nome
            conta_destino_nome = Conta.query.get(conta_destino_id).nome

            # AO CRIAR OS LANÇAMENTOS, NÃO PASSAMOS MAIS O subcategoria_id
            saida = Lancamento(
                descricao=f'Transferência para {conta_destino_nome}: {descricao}',
                valor=valor, tipo='Despesa', data_vencimento=data, data_pagamento=data,
                status='Pago', conta_id=conta_origem_id, transferencia_grupo_id=grupo.id
            )
            
            entrada = Lancamento(
                descricao=f'Transferência de {conta_origem_nome}: {descricao}',
                valor=valor, tipo='Receita', data_vencimento=data, data_pagamento=data,
                status='Pago', conta_id=conta_destino_id, transferencia_grupo_id=grupo.id
            )

            db.session.add(saida)
            db.session.add(entrada)
            flash('Transferência realizada com sucesso!', 'success')

        db.session.commit()
        return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))

    lancamentos_unicos = Lancamento.query.filter(Lancamento.recorrencia_id == None, Lancamento.transferencia_grupo_id == None).order_by(Lancamento.id.desc()).all()
    recorrencias = Recorrencia.query.order_by(Recorrencia.id.desc()).all()
    transferencias = TransferenciaGrupo.query.order_by(TransferenciaGrupo.id.desc()).all()
    
    contas = Conta.query.order_by(Conta.nome).all()
    categorias = Categoria.query.order_by(Categoria.nome).all()
    
    return render_template(
        'lancamentos.html', 
        contas=contas, 
        categorias=categorias,
        lancamentos_unicos=lancamentos_unicos,
        recorrencias=recorrencias,
        transferencias=transferencias
    )

@lancamentos_bp.route('/api/subcategorias/<int:categoria_id>')
def api_get_subcategorias(categoria_id):
    subcategorias = Subcategoria.query.filter_by(categoria_id=categoria_id).order_by(Subcategoria.nome).all()
    return jsonify([{'id': sub.id, 'nome': sub.nome} for sub in subcategorias])

@lancamentos_bp.route('/lancamentos/deletar', methods=['POST'])
def deletar_lancamento():
    tipo_exclusao = request.form.get('tipo_exclusao')
    lancamento_id = request.form.get('lancamento_id')
    recorrencia_id = request.form.get('recorrencia_id')

    if tipo_exclusao == 'unico':
        lancamento = Lancamento.query.get_or_404(lancamento_id)
        db.session.delete(lancamento)
        flash('Lançamento deletado com sucesso.', 'info')

    elif tipo_exclusao == 'todos_recorrencia':
        recorrencia = Recorrencia.query.get_or_404(recorrencia_id)
        db.session.delete(recorrencia)
        flash('Toda a recorrência foi deletada com sucesso.', 'info')

    elif tipo_exclusao == 'futuros_recorrencia':
        lancamento_base = Lancamento.query.get_or_404(lancamento_id)
        data_base = lancamento_base.data_vencimento
        
        lancamentos_a_deletar = Lancamento.query.filter(
            Lancamento.recorrencia_id == recorrencia_id,
            Lancamento.data_vencimento >= data_base
        ).all()
        
        for lanc in lancamentos_a_deletar:
            db.session.delete(lanc)
        
        recorrencia_restante = Lancamento.query.filter_by(recorrencia_id=recorrencia_id).first()
        if not recorrencia_restante:
            recorrencia_pai = Recorrencia.query.get(recorrencia_id)
            db.session.delete(recorrencia_pai)

        flash('Este e todos os futuros lançamentos da recorrência foram deletados.', 'info')
    
    db.session.commit()
    return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))

@lancamentos_bp.route('/lancamentos/editar_unico/<int:id>', methods=['GET', 'POST'])
def editar_lancamento_unico(id):
    lancamento = Lancamento.query.get_or_404(id)
    if request.method == 'POST':
        lancamento.descricao = request.form['descricao']
        lancamento.valor = float(request.form['valor'])
        lancamento.data_vencimento = datetime.strptime(request.form['data_vencimento'], '%Y-%m-%d').date()
        lancamento.subcategoria_id = request.form['subcategoria_id']
        lancamento.conta_id = request.form['conta_id']
        db.session.commit()
        flash('Lançamento atualizado com sucesso!', 'success')
        return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))

    categorias = Categoria.query.order_by(Categoria.nome).all()
    contas = Conta.query.order_by(Conta.nome).all()
    return render_template('editar_lancamento_unico.html', lancamento=lancamento, categorias=categorias, contas=contas)

@lancamentos_bp.route('/lancamentos/editar_recorrencia/<int:id>', methods=['GET', 'POST'])
def editar_recorrencia(id):
    recorrencia = Recorrencia.query.get_or_404(id)
    primeiro_lancamento = recorrencia.lancamentos[0] if recorrencia.lancamentos else None

    if request.method == 'POST':
        tipo_edicao = request.form.get('tipo_edicao')
        
        nova_descricao = request.form['descricao']
        novo_valor = float(request.form['valor'])
        nova_subcategoria_id = request.form['subcategoria_id']
        nova_conta_id = request.form['conta_id']
        
        recorrencia.descricao_base = nova_descricao
        
        lancamentos_para_alterar = []
        if tipo_edicao == 'todos':
            lancamentos_para_alterar = recorrencia.lancamentos
        elif tipo_edicao == 'futuros':
            data_inicio_str = request.form['data_inicio']
            data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d').date()
            lancamentos_para_alterar = [l for l in recorrencia.lancamentos if l.data_vencimento >= data_inicio]

        for lancamento in lancamentos_para_alterar:
            lancamento.valor = novo_valor
            lancamento.subcategoria_id = nova_subcategoria_id
            lancamento.conta_id = nova_conta_id
            if recorrencia.tipo == 'Parcelada':
                partes = lancamento.descricao.split('(')
                if len(partes) > 1:
                    lancamento.descricao = f"{nova_descricao} ({partes[1]}"

        db.session.commit()
        flash('Recorrência atualizada com sucesso!', 'success')
        return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))

    categorias = Categoria.query.order_by(Categoria.nome).all()
    contas = Conta.query.order_by(Conta.nome).all()
    return render_template('editar_recorrencia.html', recorrencia=recorrencia, primeiro_lancamento=primeiro_lancamento, categorias=categorias, contas=contas)

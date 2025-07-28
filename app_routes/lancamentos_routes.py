# app_routes/lancamentos_routes.py

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from app import db
from models import Conta, Categoria, Subcategoria, Lancamento, Recorrencia

lancamentos_bp = Blueprint(
    'lancamentos_bp', __name__,
    template_folder='../templates'
)

@lancamentos_bp.route('/lancamentos', methods=['GET', 'POST'])
def gerenciar_lancamentos():
    if request.method == 'POST':
        tipo_lancamento = request.form.get('tipo_lancamento')
        descricao = request.form.get('descricao')
        valor_total = Decimal(request.form.get('valor'))
        data_vencimento_str = request.form.get('data_vencimento')
        data_vencimento = datetime.strptime(data_vencimento_str, '%Y-%m-%d').date()
        subcategoria_id = request.form.get('subcategoria_id')
        conta_id = request.form.get('conta_id')
        recorrencia_tipo = request.form.get('recorrencia_tipo')

        if recorrencia_tipo == 'unica':
            novo_lancamento = Lancamento(
                descricao=descricao,
                valor=float(valor_total),
                tipo=tipo_lancamento,
                data_vencimento=data_vencimento,
                subcategoria_id=subcategoria_id,
                conta_id=conta_id
            )
            db.session.add(novo_lancamento)
            flash('Lançamento único adicionado com sucesso!', 'success')

        elif recorrencia_tipo == 'parcelada':
            total_parcelas = int(request.form.get('num_parcelas', 2))
            frequencia = request.form.get('frequencia', 'Mensal')
            tipo_recorrencia = 'Parcelada'
            
            valor_total_centavos = int(valor_total * 100)
            valor_parcela_centavos = valor_total_centavos // total_parcelas
            resto_centavos = valor_total_centavos % total_parcelas

            nova_recorrencia = Recorrencia(
                descricao_base=descricao, 
                tipo=tipo_recorrencia, 
                total_parcelas=total_parcelas, 
                frequencia=frequencia
            )
            db.session.add(nova_recorrencia)
            db.session.flush()

            for i in range(total_parcelas):
                valor_parcela_atual_centavos = valor_parcela_centavos
                if i == total_parcelas - 1:
                    valor_parcela_atual_centavos += resto_centavos
                
                valor_parcela_atual = float(Decimal(valor_parcela_atual_centavos) / 100)

                if frequencia == 'Semanal':
                    vencimento_parcela = data_vencimento + relativedelta(weeks=i)
                elif frequencia == 'Quinzenal':
                    vencimento_parcela = data_vencimento + relativedelta(days=i*15)
                elif frequencia == 'Anual':
                    vencimento_parcela = data_vencimento + relativedelta(years=i)
                else: # Mensal como padrão
                    vencimento_parcela = data_vencimento + relativedelta(months=i)
                
                descricao_parcela = f"{descricao} ({i+1}/{total_parcelas})"
                
                lancamento_rec = Lancamento(
                    descricao=descricao_parcela, 
                    valor=valor_parcela_atual, 
                    tipo=tipo_lancamento, 
                    data_vencimento=vencimento_parcela, 
                    subcategoria_id=subcategoria_id, 
                    conta_id=conta_id, 
                    recorrencia_id=nova_recorrencia.id
                )
                db.session.add(lancamento_rec)

            flash(f'{tipo_recorrencia} ({frequencia}) adicionada com sucesso!', 'success')
            
        elif recorrencia_tipo == 'fixa':
            frequencia = 'Mensal'
            total_meses = 60
            nova_recorrencia = Recorrencia(
                descricao_base=descricao, 
                tipo='Fixa', 
                total_parcelas=total_meses, 
                frequencia=frequencia
            )
            db.session.add(nova_recorrencia)
            db.session.flush()

            for i in range(total_meses):
                vencimento_mes = data_vencimento + relativedelta(months=i)
                lancamento_fixo = Lancamento(
                    descricao=descricao, 
                    valor=float(valor_total), 
                    tipo=tipo_lancamento, 
                    data_vencimento=vencimento_mes, 
                    subcategoria_id=subcategoria_id, 
                    conta_id=conta_id, 
                    recorrencia_id=nova_recorrencia.id
                )
                db.session.add(lancamento_fixo)
            flash(f'Lançamento fixo criado para os próximos {total_meses} meses!', 'success')
            
        db.session.commit()
        return redirect(url_for('lancamentos_bp.gerenciar_lancamentos'))

    # Lógica de visualização com ordenação por ID (mais recente primeiro)
    lancamentos_unicos = Lancamento.query.filter(Lancamento.recorrencia_id == None).order_by(Lancamento.id.desc()).all()
    recorrencias = Recorrencia.query.order_by(Recorrencia.id.desc()).all()

    contas = Conta.query.order_by(Conta.nome).all()
    categorias = Categoria.query.order_by(Categoria.nome).all()
    
    return render_template(
        'lancamentos.html', 
        contas=contas, 
        categorias=categorias,
        lancamentos_unicos=lancamentos_unicos,
        recorrencias=recorrencias
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
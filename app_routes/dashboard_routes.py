# app_routes/dashboard_routes.py

from flask import Blueprint, render_template, redirect, url_for, flash, request
from datetime import datetime
from sqlalchemy import extract

from app import db
from models import Lancamento, Conta, CartaoCredito, Categoria

dashboard_bp = Blueprint(
    'dashboard_bp', __name__,
    template_folder='../templates'
)

@dashboard_bp.route('/dashboard', methods=['GET'])
def dashboard():
    ano_selecionado = request.args.get('ano', datetime.now().year, type=int)
    mes_selecionado = request.args.get('mes', datetime.now().month, type=int)

    # Filtrar lançamentos de conta (não cartão) para o mês/ano selecionado
    lancamentos_conta_query = Lancamento.query.filter(
        extract('year', Lancamento.data_vencimento) == ano_selecionado,
        extract('month', Lancamento.data_vencimento) == mes_selecionado,
        Lancamento.conta_id.isnot(None),  # Apenas lançamentos com conta
        Lancamento.cartao_credito_id.is_(None)  # Excluir lançamentos de cartão
    )

    receitas = lancamentos_conta_query.filter_by(tipo='Receita').order_by(Lancamento.data_vencimento).all()
    despesas = lancamentos_conta_query.filter_by(tipo='Despesa').order_by(Lancamento.data_vencimento).all()

    # Buscar faturas de cartões para o mês/ano selecionado
    faturas_cartoes = []
    cartoes_ativos = CartaoCredito.query.filter_by(ativo=True).all()
    
    for cartao in cartoes_ativos:
        # Verificar se já existe um lançamento de fatura para este cartão neste mês
        fatura_existente = Lancamento.query.filter(
            extract('year', Lancamento.data_vencimento) == ano_selecionado,
            extract('month', Lancamento.data_vencimento) == mes_selecionado,
            Lancamento.conta_id == cartao.conta_pagamento_id,
            Lancamento.descricao == f'Fatura {cartao.nome}'
        ).first()
        
        if not fatura_existente:
            # Criar data de vencimento da fatura
            try:
                data_vencimento = datetime(ano_selecionado, mes_selecionado, cartao.dia_vencimento).date()
            except ValueError:
                # Se o dia não existir no mês (ex: 31 de fevereiro), usar o último dia do mês
                import calendar
                ultimo_dia = calendar.monthrange(ano_selecionado, mes_selecionado)[1]
                data_vencimento = datetime(ano_selecionado, mes_selecionado, min(cartao.dia_vencimento, ultimo_dia)).date()
            
            # Calcular valor da fatura baseado nos lançamentos do cartão no mês atual
            valor_fatura = db.session.query(db.func.sum(Lancamento.valor)).filter(
                extract('year', Lancamento.data_vencimento) == ano_selecionado,
                extract('month', Lancamento.data_vencimento) == mes_selecionado,
                Lancamento.cartao_credito_id == cartao.id,
                Lancamento.tipo == 'Despesa',
                ~Lancamento.descricao.like('Fatura %')  # Excluir faturas já criadas
            ).scalar() or 0.0
            
            # Criar objeto similar ao Lancamento para exibição
            fatura = {
                'id': f'cartao_{cartao.id}_{ano_selecionado}_{mes_selecionado}',
                'descricao': f'Fatura {cartao.nome}',
                'valor': valor_fatura,
                'data_vencimento': data_vencimento,
                'cartao': cartao,
                'status': 'Pendente',
                'tipo': 'CartaoCredito'
            }
            faturas_cartoes.append(fatura)
        else:
            # Se a fatura já existe, incluí-la na lista
            fatura_dict = {
                'id': fatura_existente.id,
                'descricao': fatura_existente.descricao,
                'valor': fatura_existente.valor,
                'data_vencimento': fatura_existente.data_vencimento,
                'cartao': cartao,
                'status': fatura_existente.status,
                'tipo': 'CartaoCredito',
                'lancamento_existente': True
            }
            faturas_cartoes.append(fatura_dict)

    # Ordenar faturas de cartões por data de vencimento
    faturas_cartoes.sort(key=lambda x: x['data_vencimento'])

    # MUDANÇA AQUI: Filtra para buscar apenas contas do tipo 'Corrente'
    contas = Conta.query.filter_by(tipo_conta='Corrente').order_by(Conta.nome).all()

    # Calcular totais para o dashboard
    total_contas_corrente = sum(conta.saldo_atual for conta in contas)
    total_receitas_mes = sum(r.valor for r in receitas)
    total_despesas_mes = sum(d.valor for d in despesas)
    total_faturas_mes = sum(f['valor'] for f in faturas_cartoes)
    total_despesas_completo = total_despesas_mes + total_faturas_mes
    
    # Calcular pendentes para projeção
    receitas_pendentes = sum(r.valor for r in receitas if r.status == 'Pendente')
    despesas_pendentes = sum(d.valor for d in despesas if d.status == 'Pendente')
    faturas_pendentes = sum(f['valor'] for f in faturas_cartoes if f['status'] == 'Pendente')
    total_despesas_pendentes = despesas_pendentes + faturas_pendentes

    anos_disponiveis = range(datetime.now().year - 5, datetime.now().year + 2)
    meses_disponiveis = [
        {'id': 1, 'nome': 'Janeiro'}, {'id': 2, 'nome': 'Fevereiro'}, {'id': 3, 'nome': 'Março'},
        {'id': 4, 'nome': 'Abril'}, {'id': 5, 'nome': 'Maio'}, {'id': 6, 'nome': 'Junho'},
        {'id': 7, 'nome': 'Julho'}, {'id': 8, 'nome': 'Agosto'}, {'id': 9, 'nome': 'Setembro'},
        {'id': 10, 'nome': 'Outubro'}, {'id': 11, 'nome': 'Novembro'}, {'id': 12, 'nome': 'Dezembro'}
    ]

    return render_template(
        'dashboard.html',
        receitas=receitas,
        despesas=despesas,
        faturas_cartoes=faturas_cartoes,
        contas=contas,
        total_contas_corrente=total_contas_corrente,
        total_receitas_mes=total_receitas_mes,
        total_despesas_mes=total_despesas_mes,
        total_faturas_mes=total_faturas_mes,
        total_despesas_completo=total_despesas_completo,
        receitas_pendentes=receitas_pendentes,
        total_despesas_pendentes=total_despesas_pendentes,
        anos_disponiveis=anos_disponiveis,
        meses_disponiveis=meses_disponiveis,
        ano_selecionado=ano_selecionado,
        mes_selecionado=mes_selecionado,
        categorias=Categoria.query.order_by(Categoria.nome).all(),
        cartoes=CartaoCredito.query.filter_by(ativo=True).order_by(CartaoCredito.nome).all()
    )


@dashboard_bp.route('/lancamentos/marcar_pago/<int:id>', methods=['POST'])
def marcar_pago(id):
    lancamento = Lancamento.query.get_or_404(id)
    
    if lancamento.status == 'Pendente':
        lancamento.status = 'Pago'
        lancamento.data_pagamento = datetime.utcnow().date()
        flash(f'Lançamento "{lancamento.descricao}" marcado como Realizado!', 'success')
    else:
        lancamento.status = 'Pendente'
        lancamento.data_pagamento = None
        flash(f'Lançamento "{lancamento.descricao}" marcado como Pendente.', 'warning')
        
    db.session.commit()
    
    ano = lancamento.data_vencimento.year
    mes = lancamento.data_vencimento.month
    return redirect(url_for('dashboard_bp.dashboard', ano=ano, mes=mes))


@dashboard_bp.route('/cartoes/marcar_fatura_paga/<int:cartao_id>/<int:ano>/<int:mes>', methods=['POST'])
def marcar_fatura_paga(cartao_id, ano, mes):
    cartao = CartaoCredito.query.get_or_404(cartao_id)
    
    # Buscar se já existe um lançamento de fatura para este cartão neste mês
    fatura_existente = Lancamento.query.filter(
        extract('year', Lancamento.data_vencimento) == ano,
        extract('month', Lancamento.data_vencimento) == mes,
        Lancamento.conta_id == cartao.conta_pagamento_id,
        Lancamento.descricao == f'Fatura {cartao.nome}'
    ).first()
    
    if fatura_existente:
        # Se já existe um lançamento de fatura, alternar status
        if fatura_existente.status == 'Pendente':
            fatura_existente.status = 'Pago'
            fatura_existente.data_pagamento = datetime.utcnow().date()
            flash(f'Fatura do {cartao.nome} marcada como Paga!', 'success')
        else:
            fatura_existente.status = 'Pendente'
            fatura_existente.data_pagamento = None
            flash(f'Fatura do {cartao.nome} marcada como Pendente.', 'warning')
            
        db.session.commit()
    else:
        # Se não existe lançamento de fatura, criar um novo
        try:
            data_vencimento = datetime(ano, mes, cartao.dia_vencimento).date()
        except ValueError:
            import calendar
            ultimo_dia = calendar.monthrange(ano, mes)[1]
            data_vencimento = datetime(ano, mes, min(cartao.dia_vencimento, ultimo_dia)).date()
        
        # Calcular valor da fatura baseado nos gastos do cartão no mês
        valor_fatura = db.session.query(db.func.sum(Lancamento.valor)).filter(
            extract('year', Lancamento.data_vencimento) == ano,
            extract('month', Lancamento.data_vencimento) == mes,
            Lancamento.cartao_credito_id == cartao_id,
            Lancamento.tipo == 'Despesa',
            ~Lancamento.descricao.like('Fatura %')  # Excluir faturas já criadas
        ).scalar() or 0.0
        
        # Criar novo lançamento de fatura como PAGO
        nova_fatura = Lancamento(
            descricao=f'Fatura {cartao.nome}',
            valor=valor_fatura,
            tipo='Despesa',
            data_vencimento=data_vencimento,
            data_pagamento=datetime.utcnow().date(),
            status='Pago',
            conta_id=cartao.conta_pagamento_id
        )
        db.session.add(nova_fatura)
        db.session.commit()
        flash(f'Fatura do {cartao.nome} criada e marcada como Paga!', 'success')
    
    return redirect(url_for('dashboard_bp.dashboard', ano=ano, mes=mes))

@dashboard_bp.route('/dashboard/editar_lancamento', methods=['POST'])
def editar_lancamento_dashboard():
    from datetime import datetime
    from models import Lancamento, Recorrencia
    
    tipo_edicao = request.form.get('tipo_edicao')
    lancamento_id = request.form.get('lancamento_id')
    
    if tipo_edicao == 'unico':
        # Editar lançamento único
        lancamento = Lancamento.query.get_or_404(lancamento_id)
        
        lancamento.descricao = request.form['descricao']
        lancamento.valor = float(request.form['valor'])
        lancamento.data_vencimento = datetime.strptime(request.form['data_vencimento'], '%Y-%m-%d').date()
        lancamento.subcategoria_id = request.form['subcategoria_id']
        
        # Atualizar conta ou cartão conforme o tipo
        if lancamento.cartao_credito_id:
            lancamento.cartao_credito_id = request.form['cartao_id']
        else:
            lancamento.conta_id = request.form['conta_id']
        
        db.session.commit()
        flash('Lançamento atualizado com sucesso!', 'success')
        
        # Retornar para o dashboard do mesmo mês
        ano = lancamento.data_vencimento.year
        mes = lancamento.data_vencimento.month
        return redirect(url_for('dashboard_bp.dashboard', ano=ano, mes=mes))
    
    elif tipo_edicao in ['apenas_mes', 'futuros']:
        # Editar recorrência
        lancamento_base = Lancamento.query.get_or_404(lancamento_id)
        recorrencia_id = request.form.get('recorrencia_id')
        
        nova_descricao = request.form['descricao']
        novo_valor = float(request.form['valor'])
        nova_subcategoria_id = request.form['subcategoria_id']
        data_inicio = datetime.strptime(request.form['data_inicio'], '%Y-%m-%d').date()
        
        # Identificar se é conta ou cartão
        if lancamento_base.cartao_credito_id:
            novo_cartao_id = request.form['cartao_id']
        else:
            nova_conta_id = request.form['conta_id']
        
        if tipo_edicao == 'apenas_mes':
            # Editar apenas o lançamento atual
            lancamento_base.descricao = nova_descricao
            lancamento_base.valor = novo_valor
            lancamento_base.subcategoria_id = nova_subcategoria_id
            
            if lancamento_base.cartao_credito_id:
                lancamento_base.cartao_credito_id = novo_cartao_id
            else:
                lancamento_base.conta_id = nova_conta_id
                
            flash('Lançamento do mês atualizado com sucesso!', 'success')
        
        elif tipo_edicao == 'futuros':
            # Editar este e futuros lançamentos
            recorrencia = Recorrencia.query.get_or_404(recorrencia_id)
            recorrencia.descricao_base = nova_descricao
            
            lancamentos_para_alterar = Lancamento.query.filter(
                Lancamento.recorrencia_id == recorrencia_id,
                Lancamento.data_vencimento >= data_inicio
            ).all()
            
            for lancamento in lancamentos_para_alterar:
                lancamento.valor = novo_valor
                lancamento.subcategoria_id = nova_subcategoria_id
                
                if lancamento.cartao_credito_id:
                    lancamento.cartao_credito_id = novo_cartao_id
                else:
                    lancamento.conta_id = nova_conta_id
                
                # Atualizar descrição para parceladas
                if recorrencia.tipo == 'Parcelada':
                    descricao_base = nova_descricao
                    parcelas_ordenadas = sorted([l for l in recorrencia.lancamentos], key=lambda x: x.data_vencimento)
                    indice_parcela = parcelas_ordenadas.index(lancamento) + 1
                    lancamento.descricao = f"{descricao_base} ({indice_parcela}/{recorrencia.total_parcelas})"
                else:
                    lancamento.descricao = nova_descricao
            
            flash('Recorrência atualizada a partir desta data!', 'success')
        
        db.session.commit()
        
        # Retornar para o dashboard do mesmo mês
        ano = lancamento_base.data_vencimento.year
        mes = lancamento_base.data_vencimento.month
        return redirect(url_for('dashboard_bp.dashboard', ano=ano, mes=mes))

@dashboard_bp.route('/dashboard/excluir_lancamento', methods=['POST'])
def excluir_lancamento_dashboard():
    from models import Lancamento, Recorrencia
    
    tipo_exclusao = request.form.get('tipo_exclusao')
    lancamento_id = request.form.get('lancamento_id')
    lancamento = Lancamento.query.get_or_404(lancamento_id)
    
    # Capturar dados para redirecionamento
    ano = lancamento.data_vencimento.year
    mes = lancamento.data_vencimento.month
    
    if tipo_exclusao == 'unico':
        # Excluir apenas este lançamento
        db.session.delete(lancamento)
        flash('Lançamento excluído com sucesso!', 'info')
    
    elif tipo_exclusao == 'apenas_mes':
        # Excluir apenas este lançamento da recorrência
        db.session.delete(lancamento)
        flash('Lançamento do mês excluído com sucesso!', 'info')
    
    elif tipo_exclusao == 'futuros':
        # Excluir este e futuros lançamentos da recorrência
        recorrencia_id = request.form.get('recorrencia_id')
        data_base = lancamento.data_vencimento
        
        lancamentos_a_deletar = Lancamento.query.filter(
            Lancamento.recorrencia_id == recorrencia_id,
            Lancamento.data_vencimento >= data_base
        ).all()
        
        for lanc in lancamentos_a_deletar:
            db.session.delete(lanc)
        
        # Se não sobraram lançamentos, deletar a recorrência
        recorrencia_restante = Lancamento.query.filter_by(recorrencia_id=recorrencia_id).first()
        if not recorrencia_restante:
            recorrencia_pai = Recorrencia.query.get(recorrencia_id)
            if recorrencia_pai:
                db.session.delete(recorrencia_pai)
        
        flash('Lançamentos futuros da recorrência foram excluídos!', 'info')
    
    db.session.commit()
    return redirect(url_for('dashboard_bp.dashboard', ano=ano, mes=mes))
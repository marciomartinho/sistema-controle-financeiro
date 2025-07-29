# app_routes/dashboard_routes.py

from flask import Blueprint, render_template, redirect, url_for, flash, request
from datetime import datetime
from sqlalchemy import extract

from app import db
from models import Lancamento, Conta, CartaoCredito

dashboard_bp = Blueprint(
    'dashboard_bp', __name__,
    template_folder='../templates'
)

@dashboard_bp.route('/dashboard', methods=['GET'])
def dashboard():
    ano_selecionado = request.args.get('ano', datetime.now().year, type=int)
    mes_selecionado = request.args.get('mes', datetime.now().month, type=int)

    lancamentos_query = Lancamento.query.filter(
        extract('year', Lancamento.data_vencimento) == ano_selecionado,
        extract('month', Lancamento.data_vencimento) == mes_selecionado
    )

    receitas = lancamentos_query.filter_by(tipo='Receita').order_by(Lancamento.data_vencimento).all()
    despesas = lancamentos_query.filter_by(tipo='Despesa').order_by(Lancamento.data_vencimento).all()

    # Buscar faturas de cartões para o mês/ano selecionado
    faturas_cartoes = []
    cartoes_ativos = CartaoCredito.query.filter_by(ativo=True).all()
    
    for cartao in cartoes_ativos:
        # Verificar se já existe um lançamento de fatura para este cartão neste mês
        fatura_existente = Lancamento.query.filter(
            extract('year', Lancamento.data_vencimento) == ano_selecionado,
            extract('month', Lancamento.data_vencimento) == mes_selecionado,
            Lancamento.cartao_credito_id == cartao.id,
            Lancamento.descricao.like('Fatura %')
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
            
            # Calcular valor da fatura (soma dos lançamentos do cartão no mês anterior ao vencimento)
            if mes_selecionado == 1:
                mes_anterior = 12
                ano_anterior = ano_selecionado - 1
            else:
                mes_anterior = mes_selecionado - 1
                ano_anterior = ano_selecionado
            
            valor_fatura = db.session.query(db.func.sum(Lancamento.valor)).filter(
                extract('year', Lancamento.data_vencimento) == ano_anterior,
                extract('month', Lancamento.data_vencimento) == mes_anterior,
                Lancamento.cartao_credito_id == cartao.id,
                Lancamento.tipo == 'Despesa'
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

    # Ordenar faturas de cartões por data de vencimento
    faturas_cartoes.sort(key=lambda x: x['data_vencimento'])

    # MUDANÇA AQUI: Filtra para buscar apenas contas do tipo 'Corrente'
    contas = Conta.query.filter_by(tipo_conta='Corrente').order_by(Conta.nome).all()

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
        anos_disponiveis=anos_disponiveis,
        meses_disponiveis=meses_disponiveis,
        ano_selecionado=ano_selecionado,
        mes_selecionado=mes_selecionado
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
    
    # Verificar se já existe um lançamento de fatura para este cartão neste mês
    fatura_existente = Lancamento.query.filter(
        extract('year', Lancamento.data_vencimento) == ano,
        extract('month', Lancamento.data_vencimento) == mes,
        Lancamento.cartao_credito_id == cartao_id,
        Lancamento.descricao.like('Fatura %')
    ).first()
    
    if fatura_existente:
        # Se existe, alternar status
        if fatura_existente.status == 'Pendente':
            fatura_existente.status = 'Pago'
            fatura_existente.data_pagamento = datetime.utcnow().date()
            flash(f'Fatura do {cartao.nome} marcada como Paga!', 'success')
        else:
            fatura_existente.status = 'Pendente'
            fatura_existente.data_pagamento = None
            flash(f'Fatura do {cartao.nome} marcada como Pendente.', 'warning')
    else:
        # Criar novo lançamento de fatura
        try:
            data_vencimento = datetime(ano, mes, cartao.dia_vencimento).date()
        except ValueError:
            import calendar
            ultimo_dia = calendar.monthrange(ano, mes)[1]
            data_vencimento = datetime(ano, mes, min(cartao.dia_vencimento, ultimo_dia)).date()
        
        # Calcular valor da fatura
        if mes == 1:
            mes_anterior = 12
            ano_anterior = ano - 1
        else:
            mes_anterior = mes - 1
            ano_anterior = ano
        
        valor_fatura = db.session.query(db.func.sum(Lancamento.valor)).filter(
            extract('year', Lancamento.data_vencimento) == ano_anterior,
            extract('month', Lancamento.data_vencimento) == mes_anterior,
            Lancamento.cartao_credito_id == cartao_id,
            Lancamento.tipo == 'Despesa'
        ).scalar() or 0.0
        
        nova_fatura = Lancamento(
            descricao=f'Fatura {cartao.nome}',
            valor=valor_fatura,
            tipo='Despesa',
            data_vencimento=data_vencimento,
            data_pagamento=datetime.utcnow().date(),
            status='Pago',
            conta_id=cartao.conta_pagamento_id,
            cartao_credito_id=cartao_id
        )
        db.session.add(nova_fatura)
        flash(f'Fatura do {cartao.nome} criada e marcada como Paga!', 'success')
    
    db.session.commit()
    return redirect(url_for('dashboard_bp.dashboard', ano=ano, mes=mes))
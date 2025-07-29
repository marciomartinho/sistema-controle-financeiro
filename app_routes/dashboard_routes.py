# app_routes/dashboard_routes.py

from flask import Blueprint, render_template, redirect, url_for, flash, request
from datetime import datetime
from sqlalchemy import extract

from app import db
from models import Lancamento, Conta

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
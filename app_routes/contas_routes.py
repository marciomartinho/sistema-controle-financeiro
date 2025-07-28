# app_routes/contas_routes.py

import os
from flask import Blueprint, render_template, request, redirect, url_for, flash
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

# Importa o 'db' e os modelos do arquivo principal da aplicação
from app import db, app
from models import Conta

# Cria o Blueprint
contas_bp = Blueprint(
    'contas_bp', __name__,
    template_folder='../templates',
    static_folder='../static'
)

@contas_bp.route('/contas', methods=['GET', 'POST'])
def gerenciar_contas():
    if request.method == 'POST':
        nome = request.form['nome']
        saldo_inicial = request.form['saldo_inicial']
        tipo_conta = request.form['tipo_conta']
        tipo_investimento = request.form.get('tipo_investimento') if tipo_conta == 'Investimento' else None
        logo_filename = None
        if 'logo_imagem' in request.files:
            logo_file = request.files['logo_imagem']
            if logo_file.filename != '':
                logo_filename = secure_filename(logo_file.filename)
                logo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
        nova_conta = Conta(nome=nome, saldo_inicial=float(saldo_inicial), tipo_conta=tipo_conta, tipo_investimento=tipo_investimento, logo_imagem=logo_filename)
        try:
            db.session.add(nova_conta)
            db.session.commit()
            flash('Conta adicionada com sucesso!', 'success')
            return redirect(url_for('contas_bp.gerenciar_contas'))
        except IntegrityError:
            db.session.rollback()
            flash('O nome da conta já existe. Por favor, escolha outro.', 'danger')
    
    contas = Conta.query.all()
    contas_corrente = sorted([c for c in contas if c.tipo_conta == 'Corrente'], key=lambda x: x.nome)
    contas_investimento = sorted([c for c in contas if c.tipo_conta == 'Investimento'], key=lambda x: x.nome)
    total_corrente = sum(c.saldo_inicial for c in contas_corrente)
    total_investimento = sum(c.saldo_inicial for c in contas_investimento)
    total_geral = total_corrente + total_investimento
    
    return render_template('contas.html', contas_corrente=contas_corrente, contas_investimento=contas_investimento, total_corrente=total_corrente, total_investimento=total_investimento, total_geral=total_geral)

@contas_bp.route('/contas/editar/<int:id>', methods=['GET', 'POST'])
def editar_conta(id):
    conta = Conta.query.get_or_404(id)
    if request.method == 'POST':
        try:
            conta.nome = request.form['nome']
            conta.saldo_inicial = float(request.form['saldo_inicial'])
            conta.tipo_conta = request.form['tipo_conta']
            conta.tipo_investimento = request.form.get('tipo_investimento') if conta.tipo_conta == 'Investimento' else None
            if 'logo_imagem' in request.files:
                logo_file = request.files['logo_imagem']
                if logo_file.filename != '':
                    if conta.logo_imagem:
                        old_logo_path = os.path.join(app.config['UPLOAD_FOLDER'], conta.logo_imagem)
                        if os.path.exists(old_logo_path):
                            os.remove(old_logo_path)
                    logo_filename = secure_filename(logo_file.filename)
                    logo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
                    conta.logo_imagem = logo_filename
            db.session.commit()
            flash('Conta atualizada com sucesso!', 'success')
            return redirect(url_for('contas_bp.gerenciar_contas'))
        except IntegrityError:
            db.session.rollback()
            flash('Já existe uma conta com este nome. Por favor, escolha outro.', 'danger')
            return render_template('editar_conta.html', conta=conta)
    return render_template('editar_conta.html', conta=conta)
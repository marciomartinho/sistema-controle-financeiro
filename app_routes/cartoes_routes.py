# app_routes/cartoes_routes.py

import os
from flask import Blueprint, render_template, request, redirect, url_for, flash
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

# Importa o 'db' e os modelos do arquivo principal da aplicação
from app import db, app
from models import CartaoCredito, Conta

# Cria o Blueprint
cartoes_bp = Blueprint(
    'cartoes_bp', __name__,
    template_folder='../templates',
    static_folder='../static'
)

@cartoes_bp.route('/cartoes', methods=['GET', 'POST'])
def gerenciar_cartoes():
    if request.method == 'POST':
        nome = request.form['nome']
        dia_vencimento = int(request.form['dia_vencimento'])
        conta_pagamento_id = request.form.get('conta_pagamento_id')
        
        # Validação do dia de vencimento
        if dia_vencimento < 1 or dia_vencimento > 31:
            flash('O dia de vencimento deve estar entre 1 e 31.', 'danger')
            return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
        
        # Converter conta_pagamento_id para None se estiver vazio
        if conta_pagamento_id == '':
            conta_pagamento_id = None
        
        logo_filename = None
        if 'logo_imagem' in request.files:
            logo_file = request.files['logo_imagem']
            if logo_file.filename != '':
                logo_filename = secure_filename(logo_file.filename)
                logo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
        
        novo_cartao = CartaoCredito(
            nome=nome, 
            dia_vencimento=dia_vencimento,
            conta_pagamento_id=conta_pagamento_id,
            logo_imagem=logo_filename
        )
        
        try:
            db.session.add(novo_cartao)
            db.session.commit()
            flash('Cartão de crédito adicionado com sucesso!', 'success')
            return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
        except IntegrityError:
            db.session.rollback()
            flash('Já existe um cartão com este nome. Por favor, escolha outro.', 'danger')
    
    cartoes = CartaoCredito.query.filter_by(ativo=True).order_by(CartaoCredito.nome).all()
    contas = Conta.query.order_by(Conta.nome).all()  # Buscar todas as contas para o dropdown
    
    return render_template('cartoes.html', cartoes=cartoes, contas=contas)

@cartoes_bp.route('/cartoes/editar/<int:id>', methods=['GET', 'POST'])
def editar_cartao(id):
    cartao = CartaoCredito.query.get_or_404(id)
    
    if request.method == 'POST':
        try:
            cartao.nome = request.form['nome']
            cartao.dia_vencimento = int(request.form['dia_vencimento'])
            
            # Atualizar conta de pagamento
            conta_pagamento_id = request.form.get('conta_pagamento_id')
            if conta_pagamento_id == '':
                cartao.conta_pagamento_id = None
            else:
                cartao.conta_pagamento_id = conta_pagamento_id
            
            # Validação do dia de vencimento
            if cartao.dia_vencimento < 1 or cartao.dia_vencimento > 31:
                flash('O dia de vencimento deve estar entre 1 e 31.', 'danger')
                contas = Conta.query.order_by(Conta.nome).all()
                return render_template('editar_cartao.html', cartao=cartao, contas=contas)
            
            if 'logo_imagem' in request.files:
                logo_file = request.files['logo_imagem']
                if logo_file.filename != '':
                    # Remove logo antigo se existir
                    if cartao.logo_imagem:
                        old_logo_path = os.path.join(app.config['UPLOAD_FOLDER'], cartao.logo_imagem)
                        if os.path.exists(old_logo_path):
                            os.remove(old_logo_path)
                    
                    logo_filename = secure_filename(logo_file.filename)
                    logo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], logo_filename))
                    cartao.logo_imagem = logo_filename
            
            db.session.commit()
            flash('Cartão de crédito atualizado com sucesso!', 'success')
            return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
        except IntegrityError:
            db.session.rollback()
            flash('Já existe um cartão com este nome. Por favor, escolha outro.', 'danger')
            contas = Conta.query.order_by(Conta.nome).all()
            return render_template('editar_cartao.html', cartao=cartao, contas=contas)
    
    contas = Conta.query.order_by(Conta.nome).all()
    return render_template('editar_cartao.html', cartao=cartao, contas=contas)

@cartoes_bp.route('/cartoes/inativar/<int:id>', methods=['POST'])
def inativar_cartao(id):
    cartao = CartaoCredito.query.get_or_404(id)
    cartao.ativo = False
    db.session.commit()
    flash(f'Cartão "{cartao.nome}" foi inativado com sucesso.', 'info')
    return redirect(url_for('cartoes_bp.gerenciar_cartoes'))
# app_routes/categorias_routes.py

from flask import Blueprint, render_template, request, redirect, url_for, flash
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

# Importa o 'db' e os modelos do arquivo principal da aplicação
from app import db
from models import Categoria, Subcategoria

# Cria o Blueprint
categorias_bp = Blueprint(
    'categorias_bp', __name__,
    template_folder='../templates'
)

@categorias_bp.route('/categorias', methods=['GET', 'POST'])
def gerenciar_categorias():
    if request.method == 'POST':
        form_type = request.form.get('form_type')
        if form_type == 'categoria':
            nova_categoria = Categoria(nome=request.form.get('nome'), cor=request.form.get('cor'), icone=request.form.get('icone'))
            db.session.add(nova_categoria)
            flash('Categoria adicionada com sucesso!', 'success')
        elif form_type == 'subcategoria':
            nova_subcategoria = Subcategoria(nome=request.form.get('nome'), categoria_id=request.form.get('categoria_id'))
            db.session.add(nova_subcategoria)
            flash('Subcategoria adicionada com sucesso!', 'success')
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash('Ocorreu um erro: o nome já pode existir.', 'danger')
        return redirect(url_for('categorias_bp.gerenciar_categorias'))
    categorias = Categoria.query.options(joinedload(Categoria.subcategorias)).order_by(Categoria.nome).all()
    return render_template('categorias.html', categorias=categorias)

@categorias_bp.route('/categorias/editar/<int:id>', methods=['GET', 'POST'])
def editar_categoria(id):
    categoria = Categoria.query.get_or_404(id)
    if request.method == 'POST':
        try:
            categoria.nome = request.form.get('nome')
            categoria.cor = request.form.get('cor')
            categoria.icone = request.form.get('icone')
            db.session.commit()
            flash('Categoria atualizada com sucesso!', 'success')
            return redirect(url_for('categorias_bp.gerenciar_categorias'))
        except IntegrityError:
            db.session.rollback()
            flash('O nome da categoria já existe.', 'danger')
    return render_template('editar_categoria.html', categoria=categoria)

@categorias_bp.route('/categorias/deletar/<int:id>', methods=['POST'])
def deletar_categoria(id):
    categoria = Categoria.query.get_or_404(id)
    db.session.delete(categoria)
    db.session.commit()
    flash('Categoria e suas subcategorias foram deletadas.', 'info')
    return redirect(url_for('categorias_bp.gerenciar_categorias'))

@categorias_bp.route('/subcategorias/editar/<int:id>', methods=['GET', 'POST'])
def editar_subcategoria(id):
    subcategoria = Subcategoria.query.get_or_404(id)
    if request.method == 'POST':
        subcategoria.nome = request.form.get('nome')
        db.session.commit()
        flash('Subcategoria atualizada com sucesso!', 'success')
        return redirect(url_for('categorias_bp.gerenciar_categorias'))
    return render_template('editar_subcategoria.html', subcategoria=subcategoria)

@categorias_bp.route('/subcategorias/deletar/<int:id>', methods=['POST'])
def deletar_subcategoria(id):
    subcategoria = Subcategoria.query.get_or_404(id)
    db.session.delete(subcategoria)
    db.session.commit()
    flash('Subcategoria deletada com sucesso.', 'info')
    return redirect(url_for('categorias_bp.gerenciar_categorias'))
# app.py

import os
import locale
from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURAÇÃO E INICIALIZAÇÃO ---
app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

UPLOAD_FOLDER = os.path.join('static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

from models import Categoria, Subcategoria, Conta, Lancamento, Recorrencia

# --- REGISTRO DOS BLUEPRINTS ---
from app_routes.contas_routes import contas_bp
from app_routes.categorias_routes import categorias_bp
from app_routes.lancamentos_routes import lancamentos_bp # NOVO IMPORT

app.register_blueprint(contas_bp)
app.register_blueprint(categorias_bp)
app.register_blueprint(lancamentos_bp) # NOVO REGISTRO

# --- FILTRO PERSONALIZADO E ROTA PRINCIPAL ---
@app.template_filter('currency')
def format_currency(value):
    if value is None: return "R$ 0,00"
    try:
        locale.setlocale(locale.LC_ALL, 'pt_BR.UTF-8')
        return locale.currency(float(value), grouping=True)
    except (ValueError, TypeError): return value

@app.route('/')
def index():
    return redirect(url_for('contas_bp.gerenciar_contas'))
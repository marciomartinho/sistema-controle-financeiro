# app.py

import os
import locale
from datetime import datetime, date # <--- GARANTA QUE 'date' ESTEJA IMPORTADO
from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
UPLOAD_FOLDER = os.path.join('static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Importa os modelos aqui
from models import Categoria, Subcategoria, Conta, Lancamento, Recorrencia, CartaoCredito, TransferenciaGrupo

# --- REGISTRO DOS BLUEPRINTS ---
from app_routes.contas_routes import contas_bp
from app_routes.categorias_routes import categorias_bp
from app_routes.lancamentos_routes import lancamentos_bp
from app_routes.dashboard_routes import dashboard_bp
from app_routes.cartoes_routes import cartoes_bp

app.register_blueprint(contas_bp)
app.register_blueprint(categorias_bp)
app.register_blueprint(lancamentos_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(cartoes_bp)

# --- FUNÇÃO PARA DISPONIBILIZAR 'now' NOS TEMPLATES ---
@app.context_processor
def inject_now():
    return {'now': datetime.now}

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
    return redirect(url_for('dashboard_bp.dashboard'))

# --- NOVO COMANDO PARA CORRIGIR DATAS (VERSÃO 2, COM HORA) ---
@app.cli.command("corrigir-datas")
def corrigir_datas_criacao():
    """
    Atualiza a data_criacao de todos os lançamentos, recorrências e 
    transferências para a data e hora atuais. Útil para corrigir dados antigos.
    """
    agora = datetime.now()
    print(f"Iniciando a atualização das datas de criação para: {agora.strftime('%d/%m/%Y %H:%M:%S')}...")

    try:
        # Atualiza Recorrências
        recorrencias_atualizadas = 0
        for r in Recorrencia.query.all():
            r.data_criacao = agora
            recorrencias_atualizadas += 1
        print(f"-> {recorrencias_atualizadas} registros de Recorrência preparados para atualização.")

        # Atualiza Transferências
        transferencias_atualizadas = 0
        for t in TransferenciaGrupo.query.all():
            t.data_criacao = agora
            transferencias_atualizadas += 1
        print(f"-> {transferencias_atualizadas} registros de Transferência preparados para atualização.")
        
        # Atualiza Lançamentos Únicos para garantir consistência
        lancamentos_atualizados = 0
        for l in Lancamento.query.filter_by(recorrencia_id=None, transferencia_grupo_id=None).all():
            l.data_criacao = agora
            lancamentos_atualizados += 1
        print(f"-> {lancamentos_atualizados} Lançamentos Únicos preparados para atualização.")

        db.session.commit()
        print("\n[SUCESSO] Todas as datas de criação foram atualizadas no banco de dados!")
    
    except Exception as e:
        db.session.rollback()
        print(f"\n[ERRO] Ocorreu um erro durante a atualização: {e}")
        print("Nenhuma alteração foi salva no banco de dados.")
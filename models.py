# models.py

from app import db
from datetime import date

# Modelo para as Categorias (Moradia, Lazer, etc.) - VERSÃO ATUALIZADA
class Categoria(db.Model):
    __tablename__ = 'categorias'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)
    # Novos campos para personalização
    cor = db.Column(db.String(7), nullable=True, default='#808080') # Para guardar um código de cor HEX, ex: #FF5733
    icone = db.Column(db.String(30), nullable=True, default='bi-tag-fill') # Para guardar uma classe de ícone, ex: bi-house-door
    
    # Relação para acessar facilmente as subcategorias de uma categoria
    subcategorias = db.relationship('Subcategoria', backref='categoria', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Categoria {self.nome}>'

# NOVO MODELO para as Subcategorias
class Subcategoria(db.Model):
    __tablename__ = 'subcategorias'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)
    # Chave estrangeira que liga a subcategoria à sua categoria-mãe
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)

    def __repr__(self):
        return f'<Subcategoria {self.nome}>'

# Modelo para as Contas (não muda neste passo)
class Conta(db.Model):
    __tablename__ = 'contas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)
    tipo_conta = db.Column(db.String(20), nullable=False, default='Corrente')
    tipo_investimento = db.Column(db.String(50), nullable=True)
    saldo_inicial = db.Column(db.Float, nullable=False, default=0.0)
    logo_imagem = db.Column(db.String(100), nullable=True)

    def __repr__(self):
        return f'<Conta {self.nome}>'

# Modelo para os Lançamentos (a transação em si) - VERSÃO ATUALIZADA
class Lancamento(db.Model):
    __tablename__ = 'lancamentos'
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    tipo = db.Column(db.String(7), nullable=False)  # 'Receita' ou 'Despesa'
    data = db.Column(db.Date, nullable=False, default=date.today)
    
    conta_id = db.Column(db.Integer, db.ForeignKey('contas.id'), nullable=False)
    # MUDANÇA IMPORTANTE: Trocamos categoria_id por subcategoria_id
    subcategoria_id = db.Column(db.Integer, db.ForeignKey('subcategorias.id'), nullable=False)
    
    conta = db.relationship('Conta', backref=db.backref('lancamentos', lazy=True))
    # Agora a relação é com Subcategoria
    subcategoria = db.relationship('Subcategoria', backref=db.backref('lancamentos', lazy=True))

    def __repr__(self):
        return f'<Lançamento {self.descricao} - R${self.valor}>'
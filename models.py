# models.py

from app import db
from datetime import date
from sqlalchemy.sql import func

class Categoria(db.Model):
    __tablename__ = 'categorias'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)
    cor = db.Column(db.String(7), nullable=True, default='#808080')
    icone = db.Column(db.String(30), nullable=True, default='bi-tag-fill')
    subcategorias = db.relationship('Subcategoria', backref='categoria', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Categoria {self.nome}>'

class Subcategoria(db.Model):
    __tablename__ = 'subcategorias'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)

    def __repr__(self):
        return f'<Subcategoria {self.nome}>'

class Conta(db.Model):
    __tablename__ = 'contas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)
    tipo_conta = db.Column(db.String(20), nullable=False, default='Corrente')
    tipo_investimento = db.Column(db.String(50), nullable=True)
    saldo_inicial = db.Column(db.Float, nullable=False, default=0.0)
    logo_imagem = db.Column(db.String(100), nullable=True)

    @property
    def saldo_atual(self):
        total_receitas = db.session.query(func.sum(Lancamento.valor)).filter(
            Lancamento.conta_id == self.id,
            Lancamento.tipo == 'Receita',
            Lancamento.status == 'Pago'
        ).scalar() or 0.0

        total_despesas = db.session.query(func.sum(Lancamento.valor)).filter(
            Lancamento.conta_id == self.id,
            Lancamento.tipo == 'Despesa',
            Lancamento.status == 'Pago'
        ).scalar() or 0.0

        return self.saldo_inicial + total_receitas - total_despesas

    def __repr__(self):
        return f'<Conta {self.nome}>'

class CartaoCredito(db.Model):
    __tablename__ = 'cartoes_credito'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), unique=True, nullable=False)
    dia_vencimento = db.Column(db.Integer, nullable=False)  # Dia do mês (1-31)
    conta_pagamento_id = db.Column(db.Integer, db.ForeignKey('contas.id'), nullable=True)  # Conta para debitar o pagamento
    logo_imagem = db.Column(db.String(100), nullable=True)
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    data_criacao = db.Column(db.Date, nullable=False, default=date.today)
    
    conta_pagamento = db.relationship('Conta', backref=db.backref('cartoes_credito', lazy=True))

    def total_gastos_mes(self, ano, mes):
        """Calcula o total de gastos do cartão em um mês específico"""
        total = db.session.query(func.sum(Lancamento.valor)).filter(
            Lancamento.cartao_credito_id == self.id,
            Lancamento.tipo == 'Despesa',
            func.extract('year', Lancamento.data_vencimento) == ano,
            func.extract('month', Lancamento.data_vencimento) == mes
        ).scalar() or 0.0
        return total

    def __repr__(self):
        return f'<CartaoCredito {self.nome}>'

class Recorrencia(db.Model):
    __tablename__ = 'recorrencias'
    id = db.Column(db.Integer, primary_key=True)
    descricao_base = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(20), nullable=False) 
    total_parcelas = db.Column(db.Integer, nullable=True)
    frequencia = db.Column(db.String(20), nullable=False, default='Mensal')
    data_criacao = db.Column(db.Date, nullable=False, default=date.today)
    lancamentos = db.relationship('Lancamento', backref='recorrencia', lazy=True, cascade="all, delete-orphan")

class TransferenciaGrupo(db.Model):
    __tablename__ = 'transferencia_grupos'
    id = db.Column(db.Integer, primary_key=True)
    data_criacao = db.Column(db.Date, nullable=False, default=date.today)

class Lancamento(db.Model):
    __tablename__ = 'lancamentos'
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    tipo = db.Column(db.String(15), nullable=False)
    data_vencimento = db.Column(db.Date, nullable=False)
    data_pagamento = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(10), nullable=False, default='Pendente')
    data_criacao = db.Column(db.Date, nullable=False, server_default=func.now())
    
    recorrencia_id = db.Column(db.Integer, db.ForeignKey('recorrencias.id'), nullable=True)
    conta_id = db.Column(db.Integer, db.ForeignKey('contas.id'), nullable=True)  # MUDANÇA: agora pode ser NULL
    subcategoria_id = db.Column(db.Integer, db.ForeignKey('subcategorias.id'), nullable=True) 
    transferencia_grupo_id = db.Column(db.Integer, db.ForeignKey('transferencia_grupos.id'), nullable=True)
    cartao_credito_id = db.Column(db.Integer, db.ForeignKey('cartoes_credito.id'), nullable=True)
    
    conta = db.relationship('Conta', backref=db.backref('lancamentos', lazy=True))
    subcategoria = db.relationship('Subcategoria', backref=db.backref('lancamentos', lazy=True))
    transferencia_grupo = db.relationship('TransferenciaGrupo', backref=db.backref('lancamentos', lazy=True, cascade="all, delete-orphan"))
    cartao_credito = db.relationship('CartaoCredito', backref=db.backref('lancamentos', lazy=True))

    def __init__(self, **kwargs):
        """
        Validação customizada: lançamento deve ter CONTA_ID OU CARTAO_CREDITO_ID, mas não ambos
        """
        super().__init__(**kwargs)
        
        # Validação: deve ter conta OU cartão, mas não ambos
        if self.conta_id and self.cartao_credito_id:
            raise ValueError("Lançamento não pode ter conta_id e cartao_credito_id ao mesmo tempo")
        
        # Para transferências, deve ter conta_id
        if self.transferencia_grupo_id and not self.conta_id:
            raise ValueError("Transferências devem ter conta_id")
        
        # Para lançamentos normais (não transferência), deve ter conta_id OU cartao_credito_id
        if not self.transferencia_grupo_id and not self.conta_id and not self.cartao_credito_id:
            raise ValueError("Lançamento deve ter conta_id ou cartao_credito_id")

    @property
    def origem_destino(self):
        """Retorna a origem/destino do lançamento (conta ou cartão)"""
        if self.conta_id:
            return self.conta.nome
        elif self.cartao_credito_id:
            return self.cartao_credito.nome
        return "N/A"

    def __repr__(self):
        return f'<Lançamento {self.descricao} - R${self.valor}>'
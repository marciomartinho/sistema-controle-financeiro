from models import Lancamento
from app import db

# Buscar faturas duplicadas
faturas = Lancamento.query.filter(
    Lancamento.descricao.like('Fatura %'),
    Lancamento.conta_id.isnot(None)
).all()

# Deletar todas
for fatura in faturas:
    db.session.delete(fatura)

db.session.commit()
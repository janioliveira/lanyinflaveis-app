"""Seed initial demo data: admin user, company, demo toys."""
import os
from datetime import datetime, timezone
from auth import hash_password, verify_password


async def seed_admin(db):
    email = os.environ.get("ADMIN_EMAIL", "admin@lanyinflaveis.com")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "name": "Administrador Lany",
            "role": "admin",
            "token_version": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password)}},
        )


async def seed_company(db):
    existing = await db.company.find_one({})
    if not existing:
        await db.company.insert_one({
            "nome_fantasia": "Lany Infláveis",
            "razao_social": "Lany Infláveis Locação de Brinquedos LTDA",
            "cnpj": "",
            "telefone": "",
            "whatsapp": "",
            "email": "contato@lanyinflaveis.com",
            "instagram": "@lanyinflaveis",
            "cep": "",
            "cidade": "",
            "estado": "",
            "endereco": "",
            "logo_url": "",
            "chave_pix": "",
            "banco": "",
            "agencia": "",
            "conta": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })


async def seed_toys(db):
    count = await db.toys.count_documents({})
    if count > 0:
        return
    demo = [
        {
            "nome": "Futebol de Sabão",
            "categoria": "Inflável",
            "descricao": "Diversão garantida! Arena inflável com sabão para partidas hilárias de futebol escorregadio.",
            "fotos": ["https://images.pexels.com/photos/10032947/pexels-photo-10032947.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"],
            "comprimento": 8.0, "largura": 4.0, "altura": 1.5, "peso": 80,
            "capacidade": 10, "faixa_etaria": "6-14 anos",
            "valor_diaria": 450.0, "valor_promocional": 400.0, "caucao": 100.0,
            "tempo_montagem": 45, "tempo_desmontagem": 30,
            "necessita_energia": True, "potencia": "1500W",
            "quantidade": 1, "estado": "Excelente", "status": "ativo",
            "observacoes": "Necessita área plana e ponto de água.",
            "is_demo": True,
        },
        {
            "nome": "Cama Elástica 4m",
            "categoria": "Recreação",
            "descricao": "Cama elástica profissional com proteção lateral. Ideal para todas as idades.",
            "fotos": ["https://images.unsplash.com/photo-1632163570616-8699e344f486?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHx0cmFtcG9saW5lfGVufDB8fHx8MTc5MDE4Nzc3MHww&ixlib=rb-4.1.0&q=85"],
            "comprimento": 4.0, "largura": 4.0, "altura": 2.5, "peso": 65,
            "capacidade": 6, "faixa_etaria": "4-14 anos",
            "valor_diaria": 250.0, "valor_promocional": 0, "caucao": 50.0,
            "tempo_montagem": 30, "tempo_desmontagem": 20,
            "necessita_energia": False, "potencia": "",
            "quantidade": 2, "estado": "Excelente", "status": "ativo",
            "observacoes": "",
            "is_demo": True,
        },
        {
            "nome": "Tobogã Inflável Gigante",
            "categoria": "Inflável",
            "descricao": "Enorme tobogã inflável com escorregador duplo. A atração preferida da criançada!",
            "fotos": ["https://images.unsplash.com/photo-1765947389722-2e96d8c0aad9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHw0fHxib3VuY2UlMjBob3VzZXxlbnwwfHx8fDE3OTAxODc3NzB8MA&ixlib=rb-4.1.0&q=85"],
            "comprimento": 10.0, "largura": 5.0, "altura": 5.0, "peso": 140,
            "capacidade": 12, "faixa_etaria": "5-14 anos",
            "valor_diaria": 600.0, "valor_promocional": 550.0, "caucao": 150.0,
            "tempo_montagem": 60, "tempo_desmontagem": 45,
            "necessita_energia": True, "potencia": "2000W",
            "quantidade": 1, "estado": "Excelente", "status": "ativo",
            "observacoes": "Necessita duas tomadas 220V.",
            "is_demo": True,
        },
    ]
    now = datetime.now(timezone.utc).isoformat()
    for t in demo:
        t["created_at"] = now
        t["updated_at"] = now
        t["deleted"] = False
    await db.toys.insert_many(demo)


async def seed_contract_template(db):
    existing = await db.contract_templates.find_one({"is_default": True})
    if existing:
        return
    template = """CONTRATO DE LOCAÇÃO DE BRINQUEDOS INFLÁVEIS

LOCADORA: Lany Infláveis
LOCATÁRIO: {NOME_CLIENTE}
CPF/CNPJ: {CPF_CLIENTE}
ENDEREÇO: {ENDERECO_CLIENTE}

DATA DO EVENTO: {DATA_EVENTO}
HORÁRIO: {HORARIO_INICIO} às {HORARIO_FIM}
LOCAL: {LOCAL_EVENTO}

BRINQUEDO(S): {BRINQUEDO}
VALOR TOTAL: R$ {VALOR_TOTAL}
VALOR PAGO: R$ {VALOR_PAGO}
VALOR RESTANTE: R$ {VALOR_RESTANTE}
FORMA DE PAGAMENTO: {FORMA_PAGAMENTO}

CLÁUSULAS:

1. OBJETO — A LOCADORA cede em locação ao LOCATÁRIO os brinquedos/equipamentos descritos acima, pelo período contratado.

2. RESPONSABILIDADES DO LOCATÁRIO — Fornecer local adequado, seguro e nivelado; disponibilizar tomada elétrica quando necessário; supervisionar as crianças durante o uso.

3. RESPONSABILIDADES DA LOCADORA — Entregar, montar, desmontar e retirar o equipamento em bom estado de funcionamento.

4. DANOS AO EQUIPAMENTO — Danos causados por mau uso são de responsabilidade do LOCATÁRIO, que deverá arcar com os custos de reparo ou substituição.

5. CANCELAMENTO — Cancelamentos com menos de 48h de antecedência não têm direito à devolução do sinal.

6. CONDIÇÕES CLIMÁTICAS — Em caso de chuva forte, o evento poderá ser remarcado sem custo adicional.

7. SEGURANÇA — É obrigatória a presença de um adulto responsável durante todo o uso dos equipamentos.

8. FORO — Fica eleito o foro da comarca da LOCADORA para dirimir qualquer questão oriunda deste contrato.

Data do contrato: {DATA_CONTRATO}

_______________________________
LOCADORA — Lany Infláveis

_______________________________
LOCATÁRIO — {NOME_CLIENTE}
"""
    from datetime import datetime as dt, timezone as tz
    await db.contract_templates.insert_one({
        "nome": "Contrato Padrão",
        "conteudo": template,
        "is_default": True,
        "created_at": dt.now(tz.utc).isoformat(),
    })


async def seed_all(db):
    await seed_admin(db)
    await seed_company(db)
    await seed_toys(db)
    await seed_contract_template(db)

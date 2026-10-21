"""
Prepara a TACO (4ª edição, NEPA/Unicamp) para o app de treino de SQL.

Lê a planilha oficial, mantém só as colunas de interesse, limpa os marcadores
especiais e gera:
  dados/taco.csv       -> CSV UTF-8 (para quem quiser usar em pandas, DuckDB etc.)
  dados/taco.sqlite    -> banco SQLite com a tabela `alimentos`
  app/taco_data.js     -> os mesmos dados embutidos para o protótipo web

Regras de limpeza:
  'Tr' (traço: presente, mas abaixo do limite de quantificação) -> 0
  'NA' (não aplicável), '*' (não analisado), vazio               -> NULL
  Carboidrato negativo (efeito do cálculo por diferença)          -> 0
  Números são arredondados para 2 casas decimais.

Uso:
  python scripts/preparar_taco.py dados/bruto/taco_4a_edicao.xlsx

Fonte: NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos (TACO),
4ª ed. revisada e ampliada. Campinas, 2011. Reprodução permitida com citação da fonte.
"""

import csv
import json
import re
import sqlite3
import sys
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent

# nome da coluna no banco -> rótulo normalizado no cabeçalho da planilha
COLUNAS = {
    "id": "numero do alimento",
    "descricao": "descricao dos alimentos",
    "energia_kcal": "energia (kcal)",
    "proteina_g": "proteina (g)",
    "lipideos_g": "lipideos (g)",
    "carboidrato_g": "carboidrato (g)",
    "sodio_mg": "sodio (mg)",
}

SEM_ACENTO = str.maketrans("áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ", "aaaaeeiooouc" + "AAAAEEIOOOUC")


def normalizar(texto):
    texto = " ".join(str(p) for p in texto if p not in (None, ""))
    texto = texto.replace("- ", "")  # "Carbo- idrato" -> "Carboidrato"
    texto = re.sub(r"\s+", " ", texto).strip().lower()
    return texto.translate(SEM_ACENTO)


def mapear_colunas(cabecalho):
    """Recebe as 3 linhas de cabeçalho e devolve {coluna_banco: índice}."""
    rotulos = [normalizar(partes) for partes in zip(*cabecalho)]
    indices = {}
    for nome, rotulo in COLUNAS.items():
        # 'Número do Alimento' aparece duas vezes (a planilha repete no meio); fica a primeira
        achados = [i for i, r in enumerate(rotulos) if r == rotulo]
        if not achados:
            raise SystemExit(f"Coluna não encontrada na planilha: {rotulo!r}\nRótulos lidos: {rotulos}")
        indices[nome] = achados[0]
    return indices


def limpar_valor(valor):
    if valor is None:
        return None
    if isinstance(valor, (int, float)):
        return round(float(valor), 2)
    texto = str(valor).strip()
    if texto.lower() == "tr":
        return 0.0
    if texto in ("", "NA", "*", "-"):
        return None
    try:
        return round(float(texto.replace(",", ".")), 2)
    except ValueError:
        raise SystemExit(f"Valor inesperado na planilha: {valor!r}")


def ler_taco(caminho):
    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    aba = wb.worksheets[0]  # 'CMVCol taco3': centesimal, minerais e vitaminas
    linhas = list(aba.iter_rows(values_only=True))
    indices = mapear_colunas(linhas[:3])

    alimentos = []
    for linha in linhas[3:]:
        numero = linha[indices["id"]]
        # pula linhas de grupo ("Cereais e derivados") e cabeçalhos repetidos
        if not isinstance(numero, (int, float)):
            continue
        registro = {
            "id": int(numero),
            "descricao": re.sub(r"\s+", " ", str(linha[indices["descricao"]])).strip(),
        }
        for nome in list(COLUNAS)[2:]:
            registro[nome] = limpar_valor(linha[indices[nome]])
        # carboidrato é calculado por diferença na TACO e às vezes fica levemente negativo
        if registro["carboidrato_g"] is not None and registro["carboidrato_g"] < 0:
            print(f"  carboidrato negativo zerado: id {registro['id']} ({registro['carboidrato_g']})")
            registro["carboidrato_g"] = 0.0
        alimentos.append(registro)
    return alimentos


def validar(alimentos):
    ids = [a["id"] for a in alimentos]
    assert len(ids) == len(set(ids)), "IDs duplicados"
    assert ids == sorted(ids), "IDs fora de ordem"
    for a in alimentos:
        assert a["descricao"], f"Descrição vazia no id {a['id']}"
        for nome in list(COLUNAS)[2:]:
            v = a[nome]
            assert v is None or v >= 0, f"Valor negativo: id {a['id']} {nome}={v}"


def salvar_csv(alimentos, destino):
    with open(destino, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(COLUNAS))
        w.writeheader()
        w.writerows(alimentos)


def salvar_sqlite(alimentos, destino):
    destino.unlink(missing_ok=True)
    con = sqlite3.connect(destino)
    con.execute("""
        CREATE TABLE alimentos (
            id            INTEGER PRIMARY KEY,
            descricao     TEXT NOT NULL,
            energia_kcal  REAL,
            proteina_g    REAL,
            lipideos_g    REAL,
            carboidrato_g REAL,
            sodio_mg      REAL
        )
    """)
    con.executemany(
        f"INSERT INTO alimentos VALUES ({', '.join('?' * len(COLUNAS))})",
        [tuple(a[c] for c in COLUNAS) for a in alimentos],
    )
    con.commit()
    con.close()


def salvar_js(alimentos, destino):
    colunas = list(COLUNAS)
    linhas = [[a[c] for c in colunas] for a in alimentos]
    js = (
        "// Gerado por scripts/preparar_taco.py - não edite à mão.\n"
        "// Fonte: TACO 4ª ed., NEPA/UNICAMP, 2011.\n"
        f"window.TACO = {{colunas: {json.dumps(colunas)}, linhas: {json.dumps(linhas, ensure_ascii=False)}}};\n"
    )
    destino.write_text(js, encoding="utf-8")


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    alimentos = ler_taco(sys.argv[1])
    validar(alimentos)

    (RAIZ / "dados").mkdir(exist_ok=True)
    (RAIZ / "app").mkdir(exist_ok=True)
    salvar_csv(alimentos, RAIZ / "dados" / "taco.csv")
    salvar_sqlite(alimentos, RAIZ / "dados" / "taco.sqlite")
    salvar_js(alimentos, RAIZ / "app" / "taco_data.js")

    nulos = {c: sum(a[c] is None for a in alimentos) for c in list(COLUNAS)[2:]}
    print(f"{len(alimentos)} alimentos exportados (ids {alimentos[0]['id']}..{alimentos[-1]['id']})")
    print("Valores NULL por coluna:", nulos)


if __name__ == "__main__":
    main()

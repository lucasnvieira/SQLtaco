# SQL com alimentos

Treino de SQL com a Tabela Brasileira de Composição de Alimentos (TACO, 4ª ed., NEPA/UNICAMP).
O SQL roda no navegador com DuckDB-WASM: não há backend. 

As decisões de modelagem e de produto estão explicadas no [CHANGELOG.md](CHANGELOG.md).

## Estrutura

```
dados/bruto/taco_4a_edicao.xlsx   planilha oficial (nepa.unicamp.br/publicacoes/tabela-taco-excel/)
scripts/preparar_taco.py          limpeza e exportação
dados/taco.csv | taco.sqlite      base limpa (tabela `alimentos`)
app/index.html                    editor + correção automática
app/exercicios.js                 enunciados, dicas e queries-gabarito
app/taco_data.js                  dados embutidos (gerado pelo script)
```

## Tabela `alimentos` (valores por 100 g)

| coluna | origem na TACO |
|---|---|
| id | Número do Alimento |
| descricao | Descrição dos alimentos |
| energia_kcal | Energia (kcal) |
| proteina_g | Proteína (g) |
| lipideos_g | Lipídeos (g) |
| carboidrato_g | Carboidrato (g) |
| sodio_mg | Sódio (mg) |

Limpeza: `Tr` vira 0; `NA`, `*` e células vazias viram NULL; carboidrato negativo (4 casos, efeito do cálculo por diferença) vira 0.

## Rodar

```bash
pip install -r requirements.txt
python scripts/preparar_taco.py dados/bruto/taco_4a_edicao.xlsx
python -m http.server 8765 --directory app
```

Abra http://localhost:8765. O `app/taco_data.js` gerado fica versionado, então para só rodar o app basta o último comando.

Para adicionar exercícios, edite `app/exercicios.js`: cada um precisa de uma `solucao`, e o app compara o resultado do aluno com o dela.

## Licença

- **Código** (`app/`, `scripts/` e configurações): [MIT](LICENSE).
- **Dados** (`dados/` e `app/taco_data.js`): adaptados da TACO e **não** cobertos pela licença MIT. A reprodução é permitida desde que a fonte seja citada:

  > NEPA/UNICAMP. *Tabela Brasileira de Composição de Alimentos (TACO)*, 4ª ed. revisada e ampliada. Campinas: NEPA-UNICAMP, 2011.

Conteúdo educacional; não substitui orientação nutricional.

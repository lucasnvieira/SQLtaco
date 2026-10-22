# Histórico de alterações

Registro resumido do que foi feito e **por quê**. Cada item traz a decisão e o raciocínio por trás dela, para quem chegar ao repositório depois (inclusive nós mesmos).

## [0.1.2] - 2026-10-21 - Licença

- **Licença MIT para o código.** É simples e permissiva, e é o padrão em projetos educacionais abertos: qualquer pessoa pode usar, adaptar e redistribuir citando a autoria.
- **Os dados ficam fora da MIT.** São adaptados da TACO, cuja condição é a reprodução com citação da fonte. Não é possível relicenciar dados de terceiros, então o `LICENSE` e o README separam explicitamente código e dados.

## [0.1.1] - 2026-10-21 - Preparação do repositório

- **Deploy pelo GitHub Pages via Actions** (`.github/workflows/pages.yml`), publicando só a pasta `app/`. O Pages "por branch" aceita apenas a raiz ou `/docs`; o workflow mantém a estrutura `app/` + `dados/` + `scripts/` sem misturar o site com o pipeline de dados.
- **Dados gerados versionados** (`app/taco_data.js`, `dados/taco.csv`, `dados/taco.sqlite`): o deploy não precisa rodar Python, e quem baixa o repositório já tem a base pronta.
- **`requirements.txt`** só com `openpyxl`, que é a única dependência do script de dados.
- **`.gitignore`** exclui a configuração local do Claude (`.claude/`), caches de Python e arquivos temporários do Excel e do sistema.
- **`.gitattributes`** grava os textos com final de linha LF, para evitar diffs falsos entre Windows e Linux, e marca `.xlsx` e `.sqlite` como binários.

## [0.1.0] - 2026-10-21 - Protótipo inicial

### Dados

- **Fonte: TACO 4ª edição (NEPA/UNICAMP, 2011).** A TACO tem planilha oficial para download e permite reprodução com citação da fonte. A TBCA (USP) é maior, mas não tem download em massa oficial e os termos de uso são mais restritivos. Fica como possível expansão, depois de consultar a equipe.
- **Só 7 colunas:** `id`, `descricao`, `energia_kcal`, `proteina_g`, `lipideos_g`, `carboidrato_g`, `sodio_mg`. São as necessárias para os exercícios de dieta (calorias, macros e sódio), e uma tabela enxuta deixa o aluno focar no SQL.
- **Nomes em snake_case com a unidade no nome.** Não precisam de aspas nem de acentos no SQL e deixam claro se o valor está em g, mg ou kcal.
- **Valores sempre por 100 g de parte comestível**, como na TACO. A conversão para porções (`valor * gramas / 100`) virou conteúdo dos exercícios.
- **Regras de limpeza** (em `scripts/preparar_taco.py`):
  - `Tr` (traço) → `0`. É uma quantidade presente, mas desprezível para cálculo de dieta.
  - `NA`, `*` e células vazias → `NULL`. Significam "não analisado ou não aplicável", o que é diferente de zero. Isso alimenta os exercícios sobre `IS NULL`.
  - Carboidrato negativo → `0`. A TACO calcula carboidrato por diferença; 4 alimentos ficaram entre -0,01 e -0,05 g.
  - Arredondamento para 2 casas, para tirar ruído de ponto flutuante da planilha (ex.: `123.53489250000001`).
- **Colunas localizadas pelo texto do cabeçalho, não pela posição.** Se uma nova versão da planilha mudar a ordem das colunas, o script continua funcionando ou falha com uma mensagem clara.
- **Linhas de grupo ignoradas** ("Cereais e derivados" etc.), conforme o pedido de manter só as 7 colunas. A informação de grupo pode voltar como coluna no futuro.
- **Validações automáticas:** ids únicos e em ordem, descrição preenchida, nenhum valor negativo. Resultado: 597 alimentos, conferidos por amostragem com a TACO impressa (ex.: arroz integral cozido = 124 kcal).
- **Três saídas:** `taco.csv` (para pandas e afins), `taco.sqlite` (para quem quiser estudar fora do app) e `app/taco_data.js` (dados embutidos no app, para funcionar em hospedagem estática sem requisição extra de dados).

### Motor SQL

- **DuckDB-WASM rodando no navegador**, sem backend. Não há servidor para manter nem banco compartilhado para alguém derrubar, e a hospedagem pode ser gratuita.
- **Por que DuckDB e não sql.js (SQLite) ou PGlite (Postgres):** o público são estudantes de dados. O DuckDB tem o dialeto mais útil para eles (`QUALIFY`, `PIVOT`, `SUMMARIZE`, `split_part`, leitura de CSV/Parquet) e é usado junto com pandas/Polars. O custo é carregar alguns MB (1 a 3 s), que o app mascara mostrando o enunciado enquanto o banco carrega. O SQLite tem armadilhas para iniciantes (divisão inteira, tipagem frouxa, sem `split_part`). O Postgres seria bom para preparação de entrevistas, mas `ROUND(double, 1)` dá erro sem `::numeric`, o que quebraria muitos gabaritos. Pode virar um "modo Postgres" no futuro.
- **`castBigIntToDouble` e `castDecimalToDouble` ligados.** O DuckDB devolve `COUNT(*)` como BigInt e literais como DECIMAL, o que complicaria a exibição e a comparação de resultados.

### Exercícios e correção

- **Correção pelo resultado, não pelo texto da query.** Existem muitas formas corretas de escrever a mesma consulta (CTE ou `QUALIFY`, `CASE` ou `VALUES`, etc.).
  - Os números são comparados com 1 casa decimal, para tolerar diferenças de arredondamento.
  - Os nomes das colunas não são verificados; o número de colunas, sim.
  - A ordem das linhas só conta quando o exercício tem `ordenado: true` (e o enunciado avisa "a ordem importa").
- **Os resultados dos gabaritos são calculados uma vez, na carga.** Se o aluno apagar ou alterar a tabela, a correção continua válida.
- **Mensagens de erro específicas:** número de colunas, número de linhas, ordem errada ou a primeira linha divergente. Ensina mais do que um simples "errado".
- **13 exercícios em 4 níveis:** fundamentos; filtros, NULL e agregações; cálculos com porções; CTEs, janelas e self-join. O conteúdo é provisório: quantidade e tipos ainda serão definidos.
- **O prato feito usa ids explícitos** (3, 561, 410). As descrições da TACO são longas e ambíguas (cru × cozido, com × sem pele), e o enunciado não deve virar uma caça ao nome certo.
- **Exercício "cru × cozido"** mostra por que confundir as duas versões estraga um cálculo de dieta: dependendo do tipo, o feijão cru tem de 3,5 a 5 vezes as calorias do cozido.
- Todos os gabaritos foram testados, além de respostas alternativas corretas (aceitas) e erradas típicas (rejeitadas com a mensagem certa), como `= NULL`, ordem invertida e esquecer as porções.

### Interface

- **Editor CodeMirror 5** com destaque de SQL; `Ctrl+Enter` executa.
- **Progresso e rascunhos salvos no navegador** (localStorage). O app funciona normalmente se o armazenamento estiver bloqueado.
- **Painel da tabela `alimentos`**, recolhível, com tipos e significado de `NULL` e `0`. Começa aberto na primeira visita e depois respeita a escolha do usuário.
- **Botão "Reiniciar banco"**: recria a tabela original. O aluno pode criar e apagar tabelas à vontade.
- **Layout para celular:** a lista de exercícios vira um bloco com rolagem, e os tipos das colunas somem do painel para não estourar a largura.

### Ajustes após revisão do protótipo

- **Removido o "Modo livre".** Era redundante: o aluno já pode executar qualquer query em qualquer exercício sem submeter, e as dicas guiam a exploração.
- **"Ver solução" sem pop-up de confirmação.** No celular, o `confirm()` é invasivo e pode fazer o usuário sair. Agora preenche direto o editor; `Ctrl+Z` recupera a query anterior.
- **Título "SQL com alimentos"** (antes "SELECT com TACO"): comunica o tema sem exigir que o usuário conheça a sigla.
- **Rodapé "Adaptado de NEPA/UNICAMP"**, porque os dados foram transformados (colunas selecionadas, limpeza, arredondamento), e não reproduzidos integralmente.
- **Botão de tema claro/escuro.** Segue o sistema até o primeiro clique e depois lembra a escolha. É aplicado antes da página aparecer, para não piscar.
- **"Verificar" com destaque próprio**, preenchido no roxo dos tipos de coluna, ao lado do verde do "Executar". Executar é para experimentar; Verificar é a submissão.
- **Sem atalho de teclado para Verificar**, de propósito: submeter deve ser um clique deliberado, "definitivo".
- **Nota do painel sem a palavra "Dialeto"**, e a seta de abrir/fechar maior, para facilitar a visualização.

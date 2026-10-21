// Exercícios do protótipo. Cada um tem uma query-gabarito (`solucao`);
// o app compara o resultado do aluno com o resultado do gabarito.
//   ordenado: true  -> a ordem das linhas importa
//   ordenado: false -> compara como conjunto de linhas
// Números são comparados com 1 casa decimal; nomes de colunas não são verificados.

window.NIVEIS = {
  1: "Fundamentos",
  2: "Filtros, NULL e agregações",
  3: "Cálculos com porções",
  4: "CTEs, janelas e self-join",
};

window.EXERCICIOS = [
  {
    id: "primeiro-contato",
    nivel: 1,
    titulo: "Primeiro contato",
    enunciado: `Mostre <b>todas as colunas</b> dos <b>10 primeiros alimentos</b>, ordenados por <code>id</code>.`,
    dica: "SELECT * traz todas as colunas. Combine ORDER BY com LIMIT.",
    ordenado: true,
    solucao: `SELECT *
FROM alimentos
ORDER BY id
LIMIT 10;`,
  },
  {
    id: "tamanho-da-base",
    nivel: 1,
    titulo: "Tamanho da base",
    enunciado: `Quantos alimentos existem na tabela <code>alimentos</code>?`,
    dica: "COUNT(*) conta linhas.",
    ordenado: false,
    solucao: `SELECT COUNT(*) AS total
FROM alimentos;`,
  },
  {
    id: "campeoes-de-proteina",
    nivel: 1,
    titulo: "Campeões de proteína",
    enunciado: `Liste <code>descricao</code> e <code>proteina_g</code> dos <b>10 alimentos com mais proteína</b>, do maior para o menor.`,
    dica: "ORDER BY ... DESC. Em DuckDB, NULLs vão para o fim por padrão, mas vale conferir no seu banco de trabalho.",
    ordenado: true,
    solucao: `SELECT descricao, proteina_g
FROM alimentos
ORDER BY proteina_g DESC
LIMIT 10;`,
  },
  {
    id: "familia-do-feijao",
    nivel: 1,
    titulo: "A família do feijão",
    enunciado: `Liste <code>id</code> e <code>descricao</code> de todos os alimentos cuja descrição <b>começa com "Feijão"</b>.`,
    dica: "LIKE com % no final: descricao LIKE 'Feijão%'.",
    ordenado: false,
    solucao: `SELECT id, descricao
FROM alimentos
WHERE descricao LIKE 'Feijão%';`,
  },
  {
    id: "o-que-falta",
    nivel: 2,
    titulo: "O que falta na tabela?",
    enunciado: `Alguns alimentos não tiveram a energia analisada. Liste <code>id</code> e <code>descricao</code> dos alimentos com <code>energia_kcal</code> <b>ausente</b>.`,
    dica: "NULL não é igual a nada, nem a NULL. Use IS NULL em vez de = NULL.",
    ordenado: false,
    solucao: `SELECT id, descricao
FROM alimentos
WHERE energia_kcal IS NULL;`,
  },
  {
    id: "classificando-proteina",
    nivel: 2,
    titulo: "Classificando proteína",
    enunciado: `Classifique cada alimento pela proteína em 100 g:
<ul>
  <li><code>'alto'</code>: 20 g ou mais</li>
  <li><code>'médio'</code>: de 10 g a menos de 20 g</li>
  <li><code>'baixo'</code>: menos de 10 g</li>
  <li><code>'sem dado'</code>: quando <code>proteina_g</code> é NULL</li>
</ul>
Retorne a <b>categoria</b> e a <b>quantidade de alimentos</b> em cada uma.`,
    dica: "CASE WHEN ... THEN ... END dentro do SELECT, depois GROUP BY. Trate o NULL primeiro.",
    ordenado: false,
    solucao: `SELECT
  CASE
    WHEN proteina_g IS NULL THEN 'sem dado'
    WHEN proteina_g >= 20   THEN 'alto'
    WHEN proteina_g >= 10   THEN 'médio'
    ELSE 'baixo'
  END AS categoria,
  COUNT(*) AS qtd
FROM alimentos
GROUP BY categoria;`,
  },
  {
    id: "media-por-familia",
    nivel: 2,
    titulo: "Média por família",
    enunciado: `Considere como <b>família</b> o primeiro termo da descrição, antes da vírgula (ex.: "Frango, peito, cru" → "Frango").
Para famílias com <b>pelo menos 8 alimentos</b>, retorne <code>familia</code>, a <b>quantidade</b> e a <b>média de kcal</b>, ordenado pela média, da maior para a menor.`,
    dica: "split_part(descricao, ',', 1) extrai o primeiro termo. Filtro em agregação vai no HAVING, não no WHERE.",
    ordenado: true,
    solucao: `SELECT
  split_part(descricao, ',', 1) AS familia,
  COUNT(*)                      AS qtd,
  ROUND(AVG(energia_kcal), 1)   AS media_kcal
FROM alimentos
GROUP BY familia
HAVING COUNT(*) >= 8
ORDER BY media_kcal DESC;`,
  },
  {
    id: "prato-feito-kcal",
    nivel: 3,
    titulo: "Calorias do prato feito",
    enunciado: `Um prato feito tem:
<ul>
  <li>150 g de <i>Arroz, tipo 1, cozido</i> (id 3)</li>
  <li>100 g de <i>Feijão, carioca, cozido</i> (id 561)</li>
  <li>120 g de <i>Frango, peito, sem pele, grelhado</i> (id 410)</li>
</ul>
Quantas <b>kcal</b> tem o prato? Retorne uma única coluna.`,
    dica: "Os valores da TACO são por 100 g. Para uma porção: energia_kcal * gramas / 100. Uma CTE com VALUES ajuda a montar a lista do prato.",
    ordenado: false,
    solucao: `WITH prato(id, gramas) AS (
  VALUES (3, 150), (561, 100), (410, 120)
)
SELECT ROUND(SUM(a.energia_kcal * p.gramas / 100), 1) AS kcal_total
FROM prato p
JOIN alimentos a USING (id);`,
  },
  {
    id: "prato-feito-macros",
    nivel: 3,
    titulo: "Macros do prato",
    enunciado: `Para o mesmo prato do exercício anterior, retorne em uma linha: <b>kcal, proteína, lipídeos, carboidrato e sódio</b> totais, nessa ordem.`,
    dica: "Mesma estrutura do anterior, com um SUM por nutriente.",
    ordenado: false,
    solucao: `WITH prato(id, gramas) AS (
  VALUES (3, 150), (561, 100), (410, 120)
)
SELECT
  ROUND(SUM(a.energia_kcal  * p.gramas / 100), 1) AS kcal,
  ROUND(SUM(a.proteina_g    * p.gramas / 100), 1) AS proteina_g,
  ROUND(SUM(a.lipideos_g    * p.gramas / 100), 1) AS lipideos_g,
  ROUND(SUM(a.carboidrato_g * p.gramas / 100), 1) AS carboidrato_g,
  ROUND(SUM(a.sodio_mg      * p.gramas / 100), 1) AS sodio_mg
FROM prato p
JOIN alimentos a USING (id);`,
  },
  {
    id: "limite-de-sodio",
    nivel: 3,
    titulo: "Quanto até o limite de sódio?",
    enunciado: `A OMS recomenda no máximo <b>2000 mg de sódio por dia</b>. Para os alimentos com sódio maior que zero, calcule <b>quantos gramas</b> bastam para atingir esse limite.
Retorne <code>descricao</code> e os gramas (1 casa decimal) dos <b>10 alimentos que atingem o limite com menos gramas</b>, do menor para o maior.`,
    dica: "Regra de três: gramas = 2000 / sodio_mg * 100. Filtre sodio_mg > 0 para não dividir por zero.",
    ordenado: true,
    solucao: `SELECT
  descricao,
  ROUND(2000 / sodio_mg * 100, 1) AS gramas_para_limite
FROM alimentos
WHERE sodio_mg > 0
ORDER BY gramas_para_limite
LIMIT 10;`,
  },
  {
    id: "calorias-da-proteina",
    nivel: 3,
    titulo: "De onde vêm as calorias?",
    enunciado: `Proteína fornece cerca de <b>4 kcal por grama</b>. Entre alimentos com <b>pelo menos 50 kcal</b> em 100 g, encontre os <b>10 com maior percentual de calorias vindas de proteína</b>.
Retorne <code>descricao</code> e o percentual (1 casa decimal), do maior para o menor.`,
    dica: "percentual = proteina_g * 4 / energia_kcal * 100.",
    ordenado: true,
    solucao: `SELECT
  descricao,
  ROUND(proteina_g * 4 / energia_kcal * 100, 1) AS pct_kcal_proteina
FROM alimentos
WHERE energia_kcal >= 50
  AND proteina_g IS NOT NULL
ORDER BY pct_kcal_proteina DESC
LIMIT 10;`,
  },
  {
    id: "mais-calorico-por-familia",
    nivel: 4,
    titulo: "O mais calórico de cada família",
    enunciado: `Usando a mesma definição de <b>família</b> do exercício "Média por família" e só famílias com <b>pelo menos 8 alimentos</b>, retorne o alimento <b>mais calórico de cada família</b>: <code>familia</code>, <code>descricao</code> e <code>energia_kcal</code>.`,
    dica: "Calcule ROW_NUMBER() OVER (PARTITION BY familia ORDER BY energia_kcal DESC) numa CTE e filtre = 1. Em DuckDB também dá para usar QUALIFY. A contagem por família pode vir de COUNT(*) OVER (PARTITION BY familia).",
    ordenado: false,
    solucao: `WITH base AS (
  SELECT
    split_part(descricao, ',', 1) AS familia,
    descricao,
    energia_kcal
  FROM alimentos
),
ranqueado AS (
  SELECT
    *,
    COUNT(*)     OVER (PARTITION BY familia)                            AS qtd,
    ROW_NUMBER() OVER (PARTITION BY familia ORDER BY energia_kcal DESC NULLS LAST) AS pos
  FROM base
)
SELECT familia, descricao, energia_kcal
FROM ranqueado
WHERE qtd >= 8 AND pos = 1;`,
  },
  {
    id: "cru-vs-cozido",
    nivel: 4,
    titulo: "Feijão: cru × cozido",
    enunciado: `Cada tipo de feijão aparece como <i>"Feijão, &lt;tipo&gt;, cru"</i> e <i>"Feijão, &lt;tipo&gt;, cozido"</i>. Para cada tipo que tem as duas versões, retorne:
<code>tipo</code>, <code>kcal_cru</code>, <code>kcal_cozido</code> e o <b>fator</b> <code>kcal_cru / kcal_cozido</code> com 2 casas.
<br><small>Esse fator explica por que confundir arroz/feijão cru com cozido estraga qualquer cálculo de dieta.</small>`,
    dica: "Self-join: a tabela com ela mesma, uma vez como 'cru' e outra como 'cozido'. split_part(descricao, ', ', 2) extrai o tipo.",
    ordenado: false,
    solucao: `WITH feijao AS (
  SELECT
    split_part(descricao, ', ', 2) AS tipo,
    split_part(descricao, ', ', 3) AS preparo,
    energia_kcal
  FROM alimentos
  WHERE descricao LIKE 'Feijão, %'
)
SELECT
  cru.tipo,
  cru.energia_kcal AS kcal_cru,
  coz.energia_kcal AS kcal_cozido,
  ROUND(cru.energia_kcal / coz.energia_kcal, 2) AS fator
FROM feijao cru
JOIN feijao coz
  ON cru.tipo = coz.tipo
WHERE cru.preparo = 'cru'
  AND coz.preparo = 'cozido';`,
  },
];

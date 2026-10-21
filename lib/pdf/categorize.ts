/**
 * Faturas em PDF não trazem categoria, então tentamos adivinhar pelo nome da
 * loja. As regras são de propósito poucas e conservadoras: o que não bate com
 * nenhuma fica como "Sem categoria". Para ajustar, edite a lista abaixo.
 * A primeira regra que combinar vence, por isso as mais específicas vêm antes.
 */
const RULES: { category: string; pattern: RegExp }[] = [
  { category: "Assinaturas", pattern: /SPOTIFY|NETFLIX|AMAZON PRIME|DISNEY|YOUTUBE|GOOGLE ONE|APPLE\.COM/ },
  { category: "Seguros", pattern: /ALLIANZ|YELUMSEG|SEGURO/ },
  { category: "Saúde", pattern: /FARMACIA|MEDICAMENT|DROGARIA|PANVEL|DROGASIL|CLINICA|LABORATORIO|CONSULTA/ },
  { category: "Mercado", pattern: /SUPERMERC|MINIMERCADO|MERCADO|ZAFFARI/ },
  { category: "Transporte", pattern: /99APP|UBER|POSTO|COMBUSTIV|IPIRANGA/ },
  { category: "Alimentação", pattern: /RESTAURANTE|PIZZARIA|CHURRASCARIA|PADARIA|LANCHONETE|IFOOD|SORVETE/ },
  { category: "Vestuário", pattern: /MODA|GRAZZIOTIN|POMPEIA/ },
];

export function categorize(place: string): string {
  const text = place
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return RULES.find((r) => r.pattern.test(text))?.category ?? "Sem categoria";
}

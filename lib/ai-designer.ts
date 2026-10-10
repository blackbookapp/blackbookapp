// Ferramentas e manual de design do editor de IA. Sem imports para poder ser testado isoladamente.
// Mantido enxuto: o Groq grátis limita tokens por minuto.

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

const SECTION_OBJ = {
  type: "object",
  properties: {
    type: { type: "string" },
    variant: { type: "string" },
    props: { type: "object" },
    style: { type: "object", description: "{background: default|alt|accent|image, image: url, spacing: compact|normal|spacious}" },
  },
  required: ["type"],
};

export const IMAGE_TOOLS = ["search_stock_photo", "generate_image"];

export function buildTools(fontKeys: string[]) {
  return [
    fn("redesign_page", "Redesenho completo: todas as seções em ordem + o tema visual completo.", {
      sections: { type: "array", items: SECTION_OBJ },
      theme: {
        type: "object",
        description: `{background, text, accent, button, buttonText: #RRGGBB (button aceita 'metallic'), headingFont: ${fontKeys.join("|")}}`,
      },
    }, ["sections", "theme"]),
    fn("apply_changes", "Aplica TODAS as alterações pontuais do pedido de uma vez, em ordem.", {
      changes: {
        type: "array",
        items: {
          type: "object",
          description:
            "Uma alteração. action e campos:\n" +
            "add_section {section, position?} | update_section {id, variant?, props?, style?} | remove_section {id} | move_section {id, position} | " +
            `update_theme {background?, text?, accent?, button?, buttonText?, headingFont? (${fontKeys.join("|")})} | ` +
            "update_profile {name?, bio?, specialty?, instagram?} | update_course {title?, subtitle?, main_promise?, description?, target_audience?, price?} | " +
            "set_modules {modules: string[]} | add_testimonial {name, text, role?, stars?} (só real) | remove_testimonial {name}",
          properties: { action: { type: "string" } },
          required: ["action"],
        },
      },
    }, ["changes"]),
    fn("search_stock_photo", "Busca 1 foto no banco de imagens; retorna url e credit (coloque o credit no campo credit).", {
      query: { type: "string", description: "em inglês" },
      orientation: { type: "string", enum: ["landscape", "portrait", "squarish"] },
    }, ["query"]),
    fn("generate_image", "Gera imagem quadrada com IA (fundos, texturas). Retorna url.", {
      prompt: { type: "string", description: "em inglês, detalhado, terminando com 'no people, no text'" },
    }, ["prompt"]),
  ];
}

export function buildDesignManual(schemaText: string, maxImageCalls: number) {
  return `Você é web designer sênior e copywriter de páginas de venda de cursos de tatuagem (plataforma Blackbook). Edite SOMENTE chamando ferramentas; nunca descreva mudança sem aplicá-la. Responda em pt-BR, até 3 linhas, sem JSON.

PEDIDO PONTUAL (mudar texto, cor, seção, foto...) → UMA chamada de apply_changes com TODAS as alterações pedidas na lista changes. Não deixe nada do pedido para depois.
PEDIDO AMPLO ("mais profissional", "melhora", "redesenha", "muda o estilo") → chame redesign_page (seções + tema completo de uma vez). Só cores não é redesenho.
Se precisar de imagem nova, chame search_stock_photo/generate_image primeiro; na etapa seguinte use a url em apply_changes ou redesign_page junto com o resto do pedido.
No redesign_page, ESCREVA o conteúdo: seção sem conteúdo não aparece na página. Obrigatório preencher:
- hero: eyebrow, title, subtitle, cta_label (e image se usar split/image);
- benefits.items: 4–6 itens {title, text};
- faq.items: 4–6 itens {q, a};
- guarantee: days e text;
- audience: title e items (3–5) ou text;
- cta: title, text, button_label;
- eyebrow/title nas demais seções. modules, testimonials e video vêm dos dados (só títulos).

ESTRUTURA: hero (sempre 1ª) → video (se tem_video) → benefits → modules (se houver) → about → gallery (se houver fotos de trabalhos) → testimonials (se houver) → bonus (só se o usuário informou) → audience → guarantee → faq → cta (sempre última). Alterne fundo default/alt; accent no máx. 1 vez. Hero "split" com retrato do criador, "image" com foto de ambiente, senão "center".

COPY: títulos curtos (≤8 palavras) focados no resultado do aluno; frases curtas; sem clichês nem promessas de dinheiro. NUNCA invente depoimentos, nomes, números, prêmios, anos de experiência, resultados, certificado, preço, "acesso vitalício", prazo de acesso, suporte individual ou comunidade — só afirme isso se o usuário disser. Benefícios = transformações dos módulos reais. FAQ = dúvidas comuns (acesso, prazo, nível, suporte, pagamento). Garantia: use 7 dias se o usuário não disser outra coisa.

DESIGN: contraste legível sempre (fundo escuro → texto claro; botão contrasta com seu texto). 1 cor de destaque. Fontes: blackwork/old school → bebas|oswald|pirata; fineline → playfair; moderno → inter|space.

VÍDEOS: para mostrar um vídeo do criador, use uma seção video com props.video_id da lista "Vídeos do criador" (pode haver várias seções video). Sem video_id, a seção mostra o vídeo de apresentação do curso (se tem_video).
IMAGENS: use só URLs dos dados (fotos do criador) ou retornadas pelas ferramentas; máx. ${maxImageCalls} por pedido; se der erro, siga sem imagem e avise numa linha.

SEÇÕES (props omitidas = dados reais do curso):
${schemaText}`;
}

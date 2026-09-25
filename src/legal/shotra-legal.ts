/**
 * Documentos que acepta quien se registra en SHOTRA: Términos y Condiciones
 * de Uso de SHOTRA y Autorización para el Tratamiento de Datos Personales de
 * CycloNet S.A.S. (responsable de las cuentas del ecosistema).
 *
 * La VERSIÓN se envía a Authoriza con el registro y queda guardada con la
 * aceptación (user_consents). Si cambia el texto, cambia la versión. La
 * autorización de datos es la misma que acepta quien contrata InOut en la
 * landing (Main_Landing/legal/tratamiento-datos.html): mantener ambas iguales.
 */

export const LEGAL_VERSIONS = {
  terms: 'shotra-terminos-2026-09-25',
  habeasData: 'cyclonet-datos-2026-09-25',
} as const;

export type LegalDocKey = 'terms' | 'habeasData';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  version: string;
  intro: string;
  sections: LegalSection[];
}

const CONTACT_EMAIL = 'ti.cyclonet@hotmail.com';

export const SHOTRA_TERMS: LegalDocument = {
  title: 'Términos y Condiciones de Uso de SHOTRA',
  version: LEGAL_VERSIONS.terms,
  intro:
    'SHOTRA es una plataforma de intermediación operada por CycloNet S.A.S. que conecta a personas que ofrecen ' +
    'servicios ("Ofertantes") con personas que los necesitan ("Solicitantes"). Al crear tu cuenta aceptas estos términos.',
  sections: [
    {
      heading: '1. Qué hace SHOTRA',
      items: [
        'SHOTRA facilita que Solicitantes publiquen necesidades, que Ofertantes envíen propuestas y que ambos acuerden y registren el servicio.',
        'CycloNet S.A.S. no presta los servicios publicados, no es empleador de los Ofertantes ni parte del acuerdo entre Ofertante y Solicitante.',
      ],
    },
    {
      heading: '2. Tu cuenta',
      items: [
        'Debes ser mayor de 18 años y registrar información veraz, completa y actualizada.',
        'La cuenta se activa al confirmar tu correo electrónico. Es personal e intransferible y debes mantener tu contraseña en reserva.',
        'Tu cuenta es la misma para el ecosistema CycloNet (Authoriza).',
      ],
    },
    {
      heading: '3. Ofertantes y Solicitantes',
      items: [
        'Los Ofertantes actúan de forma independiente y son responsables de la calidad, seguridad, legalidad y cumplimiento de los servicios que prestan, así como de sus obligaciones tributarias, de seguridad social y de los permisos que su actividad exija.',
        'Los Solicitantes deben describir con veracidad lo que necesitan, facilitar las condiciones acordadas para la prestación y pagar el valor convenido.',
        'El precio, alcance y condiciones de cada servicio los acuerdan directamente las partes al aceptar una propuesta.',
      ],
    },
    {
      heading: '4. Pago del servicio',
      items: [
        'El pago del servicio se hace directamente entre las partes, por fuera de la aplicación (efectivo, transferencia, Nequi, Daviplata, PSE u otros). SHOTRA no recibe ni custodia ese dinero.',
        'Al finalizar, el Ofertante marca el servicio como entregado y el Solicitante confirma y declara el pago (medio, valor y, si quiere, un comprobante). Esa declaración es evidencia de lo ocurrido, no una garantía de pago.',
      ],
    },
    {
      heading: '5. Comisión de intermediación (solo Ofertantes)',
      items: [
        'Usar SHOTRA como Solicitante no tiene costo.',
        'Por cada servicio completado (confirmado por ambas partes) el Ofertante reconoce a CycloNet S.A.S. una comisión sobre el precio acordado, según las tarifas vigentes publicadas en la aplicación. Hoy: 10 % en el plan FREE y 5 % en el plan PRO, con un tope de $50.000 por servicio.',
        'Las comisiones se acumulan y se facturan una vez al mes cuando el acumulado alcanza $12.000; si no lo alcanza, pasa al mes siguiente. La factura se gestiona en Authoriza y se paga por FactoNet.',
        'Si una factura no se paga oportunamente, se pueden generar intereses de mora según la ley y, tras el plazo informado en la factura, suspenderse la cuenta del Ofertante hasta el pago.',
      ],
    },
    {
      heading: '6. Conductas no permitidas',
      items: [
        'Publicar servicios ilegales, engañosos o peligrosos, o que infrinjan derechos de terceros.',
        'Suplantar a otra persona, crear cuentas falsas o manipular calificaciones.',
        'Acordar por fuera de SHOTRA servicios que se originaron en la plataforma para evitar la comisión.',
        'Acosar, discriminar o poner en riesgo a otros usuarios.',
      ],
    },
    {
      heading: '7. Calificaciones, contenidos y ubicación',
      items: [
        'Las calificaciones, reseñas, fotos del portafolio y mensajes que publiques deben ser veraces y respetuosos; eres responsable de ellos y autorizas su uso dentro de SHOTRA.',
        'Para mostrarte servicios y solicitudes cercanas, SHOTRA usa la ubicación que tú compartes.',
      ],
    },
    {
      heading: '8. Desacuerdos entre las partes',
      paragraphs: [
        'Las diferencias sobre un servicio se resuelven entre Ofertante y Solicitante. SHOTRA puede ayudar a mediar con base en el registro del servicio y la declaración de pago, sin actuar como árbitro ni garante. ' +
        'Como consumidor, puedes acudir a la Superintendencia de Industria y Comercio.',
      ],
    },
    {
      heading: '9. Suspensión y responsabilidad',
      items: [
        'CycloNet S.A.S. puede suspender o cancelar cuentas que incumplan estos términos o la ley.',
        'CycloNet S.A.S. responde por el funcionamiento de la plataforma, no por la ejecución, calidad o pago de los servicios acordados entre usuarios.',
      ],
    },
    {
      heading: '10. Cambios, contacto y ley aplicable',
      paragraphs: [
        'Podemos actualizar estos términos; te avisaremos en la aplicación y cada aceptación queda registrada con su versión. ' +
        `Contacto: ${CONTACT_EMAIL}. Estos términos se rigen por las leyes de la República de Colombia.`,
      ],
    },
  ],
};

export const CYCLONET_HABEAS_DATA: LegalDocument = {
  title: 'Autorización para el Tratamiento de Datos Personales',
  version: LEGAL_VERSIONS.habeasData,
  intro:
    'En cumplimiento de la Ley Estatutaria 1581 de 2012 y sus decretos reglamentarios, al marcar la casilla de autorización ' +
    'otorgas tu consentimiento previo, expreso e informado para que CycloNet S.A.S. trate tus datos personales en los términos de este documento.',
  sections: [
    {
      heading: '1. Responsable',
      paragraphs: [
        `CycloNet S.A.S., operador del ecosistema CycloNet (Authoriza, InOut, FactoNet, SHOTRA y Kiri Finance). Contacto para asuntos de datos personales: ${CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: '2. Datos que tratamos',
      items: [
        'Identificación: nombres, apellidos, tipo y número de documento, fecha de nacimiento, sexo y estado civil; para empresas, razón social, NIT y datos de contacto.',
        'Contacto: correo electrónico, teléfono y dirección.',
        'Cuenta y seguridad: credenciales (la contraseña se guarda cifrada), roles, registros de acceso, dirección IP y navegador.',
        'Contratación y facturación: planes, contratos, facturas, pagos y estado de cartera.',
        'Según la aplicación que uses: en SHOTRA, tu ubicación cuando la compartes, tu perfil, portafolio, propuestas, mensajes, calificaciones y declaraciones de pago; en InOut, la información de inventario, ventas y clientes que registres.',
        'No solicitamos datos sensibles ni datos de niñas, niños o adolescentes.',
      ],
    },
    {
      heading: '3. Finalidades',
      items: [
        'Crear y administrar tu cuenta, confirmar tu correo y permitirte el acceso a las aplicaciones que contrates o uses.',
        'Prestar los servicios de cada aplicación, incluido, en SHOTRA, mostrar tu perfil y propuestas a la contraparte y conectar servicios cercanos.',
        'Gestionar contratos, facturación, cobro de planes y comisiones, y el recaudo de cartera.',
        'Enviarte notificaciones operativas (verificación, facturas, vencimientos, cambios del servicio).',
        'Atender peticiones, quejas y reclamos; prevenir fraude y proteger la seguridad de la plataforma.',
        'Cumplir obligaciones legales, contables y tributarias, y requerimientos de autoridades.',
        'Elaborar estadísticas internas para mejorar las aplicaciones. El envío de publicidad requiere una autorización adicional y separada.',
      ],
    },
    {
      heading: '4. Con quién se comparten',
      items: [
        'Con otros usuarios, en lo necesario para cada servicio (por ejemplo, tu perfil con la contraparte en SHOTRA, o el negocio que te registró como usuario o cliente en InOut).',
        'Con proveedores que nos prestan servicios de nube, correo electrónico y almacenamiento de imágenes, que actúan como encargados.',
        'Con autoridades, cuando la ley lo exija.',
      ],
    },
    {
      heading: '5. Tus derechos',
      items: [
        'Conocer, actualizar y rectificar tus datos.',
        'Solicitar prueba de esta autorización.',
        'Ser informado sobre el uso que se ha dado a tus datos.',
        'Revocar la autorización y/o pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos.',
        'Acceder gratuitamente a tus datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio.',
      ],
    },
    {
      heading: '6. Cómo ejercerlos',
      paragraphs: [
        `Escríbenos a ${CONTACT_EMAIL} indicando tu nombre, documento, correo de la cuenta y tu solicitud. Las consultas se atienden en máximo 10 días hábiles (prorrogables 5) y los reclamos en máximo 15 días hábiles (prorrogables 8), conforme a los artículos 14 y 15 de la Ley 1581 de 2012.`,
      ],
    },
    {
      heading: '7. Almacenamiento, transmisión y seguridad',
      paragraphs: [
        'Los datos se almacenan en infraestructura de nube ubicada fuera de Colombia (Estados Unidos). Al autorizar, aceptas esa transmisión internacional a nuestros proveedores, que solo los tratan para las finalidades descritas y con medidas de seguridad técnicas y administrativas razonables.',
      ],
    },
    {
      heading: '8. Vigencia',
      paragraphs: [
        'Tratamos los datos mientras tengas una cuenta activa y durante el tiempo necesario para cumplir las finalidades y los deberes legales de conservación. Esta autorización queda registrada con su versión, fecha, IP y navegador como prueba.',
      ],
    },
    {
      heading: '9. Declaración',
      paragraphs: [
        'Declaro que leí y comprendí esta autorización, que la información que suministro es veraz, y que autorizo de manera previa, expresa e informada a CycloNet S.A.S. para tratar mis datos personales conforme a lo aquí descrito.',
      ],
    },
  ],
};

export function legalDocument(key: LegalDocKey): LegalDocument {
  return key === 'terms' ? SHOTRA_TERMS : CYCLONET_HABEAS_DATA;
}

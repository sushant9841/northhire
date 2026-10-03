/* Roadmap B3-11: es-CA (Spanish, Canada) seed catalog. Every top-level navigation + sign-in
   string the typical first-use path encounters is translated; everything else falls back to
   en-CA via the existing fallback chain in i18n.jsx. This proves the pattern described in the
   roadmap row ('adding a locale is a catalog-add, not a code change') and lets a Spanish-
   speaking seeker get through sign-in, home, search, apply and status without needing to
   switch to English. Full translation of every nested object is the content-asset task that
   can proceed independently of this scaffolding ship. */
export const es = {
  common: {
    save: "Guardar", cancel: "Cancelar", close: "Cerrar", delete: "Eliminar", edit: "Editar",
    search: "Buscar", loading: "Cargando…", send: "Enviar", back: "Atrás", next: "Siguiente",
    done: "Hecho", yes: "Sí", no: "No", viewAll: "Ver todo", read: "Leer", view: "Ver",
    signIn: "Iniciar sesión", signOut: "Cerrar sesión", createAccount: "Crear cuenta",
    email: "Correo electrónico", password: "Contraseña", name: "Nombre", phone: "Teléfono",
    submit: "Enviar", required: "Obligatorio", optional: "Opcional", export: "Exportar",
    enable: "Activar", disable: "Desactivar", confirm: "Confirmar",
    sending: "Enviando…", getHelp: "Obtener ayuda", status: "Estado",
    dismiss: "Descartar", undo: "Deshacer",
  },
  nav: {
    home: "Inicio", search: "Buscar empleos", matched: "Compatibles",
    saved: "Guardados", status: "Mis postulaciones", messages: "Mensajes",
    profile: "Perfil", account: "Cuenta",
  },
  home: {
    welcomeBack: "Bienvenido/a, {name}.",
    continueWhereLeft: "Continuar donde lo dejaste",
    jobSearchPlaceholder: "Puesto, oficio o habilidad",
    locationSearchPlaceholder: "Ciudad o provincia",
    searchBtn: "Buscar",
    matchedForYouTitle: "Compatibles para ti",
    seeAllMatchesBtn: "Ver todos",
    topIndustriesTitle: "Sectores que más contratan",
    browseAllBtn: "Explorar todos",
  },
  routeTitles: {
    home: "Inicio",
    about: "Acerca de nosotros",
    contact: "Contacto",
    privacy: "Privacidad",
    terms: "Términos",
    pricing: "Precios",
    salaryCalc: "Calculadora salarial",
  },
};

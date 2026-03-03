<h1 align="center">
  🕰️ Watchclock
</h1>

<p align="center">
  <strong>Una experiencia hiper-inmersiva, multifuncional y enfocada en la productividad.</strong>
</p>

<p align="center">
  <img src="Mockup%20Dark.png" alt="Mockup Dark" width="45%" style="border-radius: 12px; margin-right: 5%;"/>
  <img src="Mockup%20Ligh.png" alt="Mockup Light" width="45%" style="border-radius: 12px;"/>
</p>

<p align="center">
  <a href="#-sobre-el-proyecto">Proyecto</a> •
  <a href="#-características-principales">Características</a> •
  <a href="#-tecnologías-utilizadas">Tecnologías</a> •
  <a href="#-instalación-y-uso">Instalación</a>
</p>

---

## 📖 Sobre el proyecto

**Watchclock** no es solo un reloj; es un «dashboard» o panel de control pensado para mantenerlo siempre activo en tu dispositivo o tablet. Combina productividad, entretenimiento y relajación en una única interfaz con soporte a múltiples temas y módulos interactivos (¡incluyendo hasta un juego de tablero!). 

Con un diseño inspirado en diferentes estilos de vida, incorpora un sistema de «flip panels» donde las ventanas interactúan revelando módulos adicionales bajo demanda.

## ✨ Características Principales

### ⏱️ Productividad & Tiempo
- **Reloj Dual:** Representación analógica elegante y digital precisa.
- **Temporizadores Temáticos (Pomodoro):** Incluyen modos como _Focus_ (10m), _Coffee_ (5m) y _Lunch_ (20m). Al iniciarse y activar a pantalla completa reproducen videos inmersivos diseñados para maximizar la concentración o relajación.

### 🌤️ Entorno & Widgets
- **Clima Dinámico Geométrico:** Autodetecta tu ubicación mediante tu IP de red de forma anónima y consulta el estado meteorológico y la temperatura en tiempo real.
- **Mantener pantalla encendida (Wake Lock):** Activa esta opción para impedir que el dispositivo se suspenda o apague la pantalla, ideal para tenerlo en una base de iPad/Tablet.
- **Frase inspiracional del día (QOTD):** Mantén la motivación con reflexiones diarias.

### 🎨 Personalización visual
- **Temas:** Soporte nativo y persistente a través de _localStorage_ a vistas alternas:
  - 🌙 _Dark Mode_ 
  - ☀️ _Light Mode_
  - ⚙️ _Steampunk Mode_ (que incluye un increíble fondo dinámico mecánico de estilo Steampunk).

### 🎛️ Paneles Extra e Interactividad
Gracias al sistema de rotación de paneles traseros, puedes navegar por utilidades sin perder el foco:
- **🎧 Integración con Spotify:** Reproductor y librería de Spotify integrados completamente de manera fluida.
- **📅 Vista de Calendario:** Revisa eventos o fechas importantes rápidamente.
- **🔭 Observatorio Celestial:** Construido sobre _Three.js_ y un motor astronómico real, localiza las estrellas y muestra de forma interactiva la red de constelaciones según tu ubicación detectada en la tierra.
- **🕹️ Juego de Go (Go Board):** Un tablero de Go (9x9) completamente jugable que respeta reglas de captura, cálculo de _Komi_ japonés, persistencia de puntuaciones y hasta cuenta con una Inteligencia Artificial para cuando desees desconectar entrenando tu mente.

---

## 🛠️ Tecnologías utilizadas

Este proyecto ha sido construido con una gran pila tecnológica moderna:

* **[React 19](https://react.dev/):** Para una renderización rápida y eficiente.
* **[Vite](https://vitejs.dev/):** El motor para desarrollo super-rápido y generador de build en la web actual.
* **[Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber):** Experiencias y objetos 3D acelerados para el observatorio celestial.
* **[Astronomy Engine](https://github.com/cosinekitty/astronomy):** Cálculo astronómico estático en tiempo real de estrellas y satélites.

## 🚀 Instalación y uso

Si deseas ejecutar este proyecto localmente, sigue los siguientes pasos:

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/watchclock.git
cd watchclock
```

### 2. Instalar las dependencias
Asegúrate de tener [Node.js](https://nodejs.org/) instalado en tu sistema.
```bash
npm install
```

### 3. Configurar entorno
El proyecto cuenta con un archivo `.env` que puede requerir credenciales (por ejemplo, los `client id` de Spotify API si lo tienes integrado). Rellénalos usando de plantilla un `.env.example` en caso de existir.

### 4. Lanzar servidor de desarrollo
```bash
npm run dev
```

La aplicación estará sirviéndose por defecto en algo como `http://localhost:5173`. ¡Abre esa URL y disfruta!

## 🔮 Próximos pasos (Roadmap)
- [ ] Autenticación ampliada y perfiles de productividad.
- [ ] Más modos del temporizador (Configurables).
- [ ] Traducciones i18n y L10n.

---

> Elaborado con ❤️ para los amantes de la productividad y los buenos diseños de interfaces.

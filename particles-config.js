/* particles.js config – https://github.com/VincentGarreau/particles.js */
particlesJS("particles-js", {
  "particles": {
    "number": {
      "value": 250, // Cantidad de puntos
      "density": {
        "enable": true,
        "value_area": 800
      }
    },
    "color": {
      "value": "#3498db" // Color de los puntos (Azul principal)
    },
    "shape": {
      "type": "circle",
      "stroke": {
        "width": 0,
        "color": "#000000"
      },
    },
    "opacity": {
      "value": 0.5,
      "random": false,
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": {
      "value": 3,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 40,
        "size_min": 0.1,
        "sync": false
      }
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#3498db", // Color de las líneas
      "opacity": 0.4,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 1, // Velocidad del movimiento
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200
      }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true, // Activar interactividad con ratón
        "mode": "grab" // Las líneas se "agarran" al ratón
      },
      "onclick": {
        "enable": true,
        "mode": "push" // Añade más puntos al hacer clic
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 140,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": {
        "distance": 200,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
});
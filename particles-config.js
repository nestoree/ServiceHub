particlesJS("particles-js", {
  particles: {
    number: {
      value: 150,
      density: {
        enable: true,
        value_area: 900
      }
    },
    color: {
      value: ["#7ad5ff", "#8ff3b4", "#ffffff"]
    },
    shape: {
      type: "circle",
      stroke: {
        width: 0,
        color: "#000000"
      }
    },
    opacity: {
      value: 0.35,
      random: true,
      anim: {
        enable: true,
        speed: 0.6,
        opacity_min: 0.12,
        sync: false
      }
    },
    size: {
      value: 4,
      random: true,
      anim: {
        enable: false,
        speed: 20,
        size_min: 0.1,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#7ad5ff",
      opacity: 0.24,
      width: 1
    },
    move: {
      enable: true,
      speed: 0.9,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: true,
        mode: "grab"
      },
      onclick: {
        enable: true,
        mode: "bubble"
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 150,
        line_linked: {
          opacity: 0.65
        }
      },
      bubble: {
        distance: 220,
        size: 8,
        duration: 1.8,
        opacity: 0.7,
        speed: 3
      },
      repulse: {
        distance: 180,
        duration: 0.4
      }
    }
  },
  retina_detect: true
});

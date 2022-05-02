const frame = document.querySelector('#content-frame');
const frameWindow = frame.contentWindow;


const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const setLoopsNeeded = () => {
  loopsNeeded = randInt(4,6);
};

let loops = 0;
let loopsNeeded;
setLoopsNeeded();

const intId = setInterval(() => {
  if (frameWindow.sampleCount > loopsNeeded) {
    if (frameWindow.audioZeroCount > 0) {
      console.error('repro?', frameWindow.audioZeroCount);
      window.stop();
    } else {
      console.error('frameWindow.audioZeroCount', frameWindow.audioZeroCount);
      frameWindow.location.reload();
      loops = 0;
      setLoopsNeeded();
    }
  }
}, 500);

window.stop = () => clearInterval(intId);

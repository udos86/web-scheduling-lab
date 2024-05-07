function squares() {
  return document.querySelectorAll('.square');
}

function form() {
  return document.querySelector('form');
}

function getSchedulerApi() {
  return form().elements['api'].value;
}

function yieldToMainOnScheduled() {
  const checked = form().elements['yieldToMainOnScheduled'].checked;
  // console.log('yieldToMainOnScheduled', checked);
  return checked;
}

function yieldToMainOnTaskEnd() {
  const checked = form().elements['yieldToMainOnTaskEnd'].checked;
  // console.log('yieldToMainOnTaskEnd', checked);
  return checked;
}

function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function simulateWorkload(callback, size = 10000000 * 100) {
  for (let temp, i = 0; i < size; i++) {
    temp = i;
  }
  callback();
}

function setSquareBackgroundColor(square, color = '#FF0000') {
  square.style.backgroundColor = color;
}

async function task(square) {
  console.log('Task started');
  simulateWorkload(() => {
    setSquareBackgroundColor(square, '#0000FF');
  });
  console.log('Task finished, now yielding');

  if (yieldToMainOnTaskEnd()) await yieldToMain();
}

function* taskScheduler(squares) {
  let index = 0;

  while (index < squares.length) {
    const square = squares.item(index);
    requestAnimationFrame(() => task(square));
    yield index++;
  }
}

window.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btnRunTask').addEventListener('click', () => {
    let fn = null;

    switch (getSchedulerApi()) {
      case 'none':
        fn = square => (task(square));
        break;

      case 'setTimeout':
        fn = square => setTimeout(() => task(square), 0);
        break;

      case 'requestIdleCallback':
        fn = square => requestIdleCallback(() => task(square));
        break;

      case 'requestAnimationFrame':
        fn = square => requestAnimationFrame(() => task(square));
        break;

      case 'requestAnimationFrameRecursive':
        let lastTimestamp = null;
        fn = square => requestAnimationFrame((timestamp) => {
          if (timestamp === lastTimestamp) {
            fn(square);
          } else {
            lastTimestamp = timestamp;
            task(square);
          }
        });
        break;

      case 'queueMicrotask':
        fn = square => queueMicrotask(() => task(square));
        break;

      case 'postTask':
        fn = square => scheduler.postTask(() => task(square));
        break;

      case 'messageChannel':
        fn = square => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => task(square);
          channel.port2.postMessage(null);
        };
        break;

      case 'rafMessageChannel': // see https://webperf.tips/tip/measuring-paint-time/
        fn = square => {
          requestAnimationFrame(() => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => task(square);
            channel.port2.postMessage(null);
          });
        };
        break;

      case 'mutationObserver':
        fn = square => {
          const observer = new MutationObserver(() => task(square));
          const node = document.createTextNode('');
          observer.observe(node, { characterData: true });
          node.data = 'schedule';
        }
        break;

      case 'generator':
        const _scheduler = taskScheduler(squares());
        (async () => {
          for (const _result of _scheduler) {
            if (yieldToMainOnScheduled()) await yieldToMain();
          }
        })();
        break;
    }

    if (fn === null) return;

    (async () => {
      for (const square of squares()) {
        fn(square);
        requestAnimationFrame(() => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => console.log('Paint');
          channel.port2.postMessage(null);
        });
        if (yieldToMainOnScheduled()) await yieldToMain();
      }
    })();

  });

  document.getElementById('btnReset').addEventListener('click', () => {
    squares().forEach(square => setSquareBackgroundColor(square, '#FF0000'))
  });
});


// see https://github.com/kriskowal/asap
// see https://github.com/kriskowal/asap/blob/master/browser-raw.js
// see https://github.com/kriskowal/asap/blob/master/browser-asap.js

// see https://github.com/facebook/react/tree/main/packages/scheduler
// see https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/Scheduler.js
// see https://github.com/facebook/react/blob/main/packages/scheduler/src/forks/SchedulerPostTask.js
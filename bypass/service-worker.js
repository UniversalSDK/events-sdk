// Service Worker для обхода блокировщиков
self.addEventListener('message', function(event) {
  if (event.data.type === 'track') {
    sendTrackingData(event.data.payload);
  }
});

async function sendTrackingData(data) {
  console.log('SW: Sending tracking data', data);
  
  // Пробуем разные методы отправки
  const methods = [
    () => sendViaFetch(data),
    () => sendViaBeacon(data),
    () => sendViaXHR(data)
  ];
  
  for (const method of methods) {
    try {
      await method();
      console.log('SW: Data sent successfully');
      return;
    } catch (e) {
      console.log('SW: Method failed:', e);
    }
  }
}

function sendViaFetch(data) {
  const url = new URL('https://affiliate.33rd.pro/api/tracker.php');
  Object.entries(data).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, String(value));
  });
  
  return fetch(url.toString(), {
    method: 'GET',
    mode: 'no-cors'
  });
}

function sendViaBeacon(data) {
  const url = new URL('https://affiliate.33rd.pro/api/tracker.php');
  Object.entries(data).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, String(value));
  });
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url.toString());
    return Promise.resolve();
  } else {
    return Promise.reject('Beacon not supported');
  }
}

function sendViaXHR(data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = new URL('https://affiliate.33rd.pro/api/tracker.php');
    Object.entries(data).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, String(value));
    });
    
    xhr.open('GET', url.toString());
    xhr.onload = () => resolve();
    xhr.onerror = () => reject('XHR failed');
    xhr.send();
  });
}
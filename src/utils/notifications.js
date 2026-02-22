// Request permission to send notifications
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Send a web notification
export const sendNotification = (title, body) => {
    if (Notification.permission === 'granted') {
        const options = {
            body: body,
            icon: '/pwa-192x192.png',
            requireInteraction: true // Keeps notification on screen until user interacts
        };
        new Notification(title, options);
    }
};

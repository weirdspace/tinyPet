var NotificationSystem = {
    notifications: [],
    container: null,
    maxNotifications: 5,

    init: function() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    },

    createNotification: function(message, type = 'success', duration = 2500) {
        if (this.notifications.length >= this.maxNotifications) {
            this.removeNotification(this.notifications[0]);
        }

        var notification = document.createElement('div');
        notification.className = 'notification ' + type;
        notification.onclick = function() {
            NotificationSystem.removeNotification(notification);
        };

        var messageElem = document.createElement('span');
        messageElem.innerText = message;
        notification.appendChild(messageElem);

        var closeButton = document.createElement('button');
        closeButton.className = 'close-btn';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = function(event) {
            event.stopPropagation(); // Empêche l'événement de clic de se propager à la notification
            NotificationSystem.removeNotification(notification);
        };
        notification.appendChild(closeButton);

        var progressBar = document.createElement('div');
        progressBar.className = 'progress';
        progressBar.style.animationDuration = duration + 'ms';
        notification.appendChild(progressBar);

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Remove notification after duration
        setTimeout(function() {
            NotificationSystem.removeNotification(notification);
        }, duration);
    },

    removeNotification: function(notification) {
        notification.style.opacity = '0';
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            NotificationSystem.notifications = NotificationSystem.notifications.filter(function(notif) {
                return notif !== notification;
            });
        }, 300); // Match with CSS animation duration
    }
};

// Initialize the notification system on page load
document.addEventListener('DOMContentLoaded', function() {
    NotificationSystem.init();
});

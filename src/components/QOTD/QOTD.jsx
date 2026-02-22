import { useState, useEffect } from 'react';
import './QOTD.css';

const QUOTES = [
    { text: "La inspiración existe, pero tiene que encontrarte trabajando.", author: "Pablo Picasso" },
    { text: "No mires el reloj; haz lo que él hace. Sigue moviéndote.", author: "Sam Levenson" },
    { text: "El mejor momento para plantar un árbol fue hace veinte años. El segundo mejor momento es ahora.", author: "Proverbio Chino" },
    { text: "El éxito no es el final, el fracaso no es fatal: es el coraje para continuar lo que cuenta.", author: "Winston Churchill" },
    { text: "Lo que haces hoy puede mejorar todas tus mañanas.", author: "Ralph Marston" },
    { text: "Empieza donde estás. Usa lo que tienes. Haz lo que puedes.", author: "Arthur Ashe" },
    { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" }
];

export default function QOTD({ theme, isHidden }) {
    const [quoteIndex, setQuoteIndex] = useState(0);
    const [fadeState, setFadeState] = useState('fade-in');

    useEffect(() => {
        // 5 minutes in milliseconds
        const INTERVAL = 5 * 60 * 1000;
        const FADE_DURATION = 1000; // 1 second for fade out

        const timer = setInterval(() => {
            // Start fade out
            setFadeState('fade-out');

            // Wait for fade out to complete, then change quote and fade in
            setTimeout(() => {
                setQuoteIndex((prevIndex) => (prevIndex + 1) % QUOTES.length);
                setFadeState('fade-in');
            }, FADE_DURATION);

        }, INTERVAL);

        return () => clearInterval(timer);
    }, []);

    const quote = QUOTES[quoteIndex];

    return (
        <div className={`qotd-container ${theme}-qotd ${isHidden ? 'qotd-hidden' : ''}`}>
            <div className={`qotd-content ${fadeState}`}>
                <p className="qotd-text">"{quote.text}"</p>
                <p className="qotd-author">- {quote.author}</p>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import './QOTD.css';

const QUOTES = [
    { text: "La inspiración existe, pero tiene que encontrarte trabajando.", author: "Pablo Picasso" },
    { text: "No mires el reloj; haz lo que él hace. Sigue moviéndote.", author: "Sam Levenson" },
    { text: "El mejor momento para plantar un árbol fue hace veinte años. El segundo mejor momento es ahora.", author: "Proverbio Chino" },
    { text: "El éxito no es el final, el fracaso no es fatal: es el coraje para continuar lo que cuenta.", author: "Winston Churchill" },
    { text: "Lo que haces hoy puede mejorar todas tus mañanas.", author: "Ralph Marston" },
    { text: "Empieza donde estás. Usa lo que tienes. Haz lo que puedes.", author: "Arthur Ashe" },
    { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
    { text: "La única manera de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
    { text: "El secreto para salir adelante es comenzar.", author: "Mark Twain" },
    { text: "Bien hecho es mejor que bien dicho.", author: "Benjamin Franklin" },
    { text: "No esperes. El momento nunca será el adecuado.", author: "Napoleon Hill" },
    { text: "Todo parece imposible hasta que se hace.", author: "Nelson Mandela" },
    { text: "Cae siete veces, levántate ocho.", author: "Proverbio Japonés" },
    { text: "El dolor es temporal. Rendirse dura para siempre.", author: "Lance Armstrong" },
    { text: "Si puedes soñarlo, puedes hacerlo.", author: "Walt Disney" },
    { text: "No te detengas cuando estés cansado. Detente cuando hayas terminado.", author: "Desconocido" },
    { text: "Una pequeña acción positiva hoy vale más que mil planes para mañana.", author: "Desconocido" },
    { text: "La disciplina es el puente entre tus metas y tus logros.", author: "Jim Rohn" },
    { text: "Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto, sino un hábito.", author: "Aristóteles" },
    { text: "El trabajo duro vence al talento cuando el talento no trabaja duro.", author: "Tim Notke" },
    { text: "Primero domínate a ti mismo. Luego habrás dominado todo.", author: "Sun Tzu" },
    { text: "La concentración es la raíz de toda capacidad humana.", author: "Bruce Lee" },
    { text: "No hay atajos para ningún lugar que valga la pena ir.", author: "Beverly Sills" },
    { text: "Haz cada día lo que los demás no quieren hacer, y mañana tendrás lo que los demás no pueden tener.", author: "Desconocido" },
    { text: "El objetivo del descanso es prepararte para el esfuerzo.", author: "Lao Tzu" },
    { text: "Una hora de juego revela más sobre una persona que un año de conversación.", author: "Platón" },
    { text: "Tu futuro yo te lo agradecerá.", author: "Desconocido" },
    { text: "Gana la mañana, gana el día.", author: "Robin Sharma" },
    { text: "No tienes que ser genial para empezar, pero tienes que empezar para ser genial.", author: "Zig Ziglar" },
    { text: "Con suficiente disciplina, casi cualquier obstáculo puede superarse.", author: "Theodore Roosevelt" },
];

export default function QOTD({ theme, isHidden }) {
    const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
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


import React, { useRef, useState, useEffect } from 'react';
import Button from './Button';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onClear: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas resolution for high DPI displays
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(ratio, ratio);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000000';
        }
    }, []);

    const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = (event as React.MouseEvent).clientX;
            clientY = (event as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault(); // Prevent scrolling on touch
        setIsDrawing(true);
        const { x, y } = getCoordinates(event);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        event.preventDefault();
        const { x, y } = getCoordinates(event);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            setHasDrawn(true);
        }
    };

    const endDrawing = () => {
        setIsDrawing(false);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear scaled canvas
            setHasDrawn(false);
            onClear();
        }
    };

    const handleSave = () => {
        if (!hasDrawn || !canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg w-full h-48 bg-white touch-none cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
            </div>
            <p className="text-xs text-gray-400 mt-1 mb-3">Firma dentro del recuadro usando tu dedo o ratón</p>
            <div className="flex space-x-3 w-full">
                <Button variant="secondary" onClick={handleClear} className="flex-1">Borrar</Button>
                <Button onClick={handleSave} disabled={!hasDrawn} className="flex-1">Guardar Firma</Button>
            </div>
        </div>
    );
};

export default SignaturePad;

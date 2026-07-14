import React, { useEffect, useRef } from 'react';
import styles from './GrainCanvas.module.css';

export default function GrainCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        let frameId = 0;
        let grainImage: ImageData | null = null;
        let width = 0;
        let height = 0;
        const pointer = { x: 0, y: 0 };
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function generateGrain() {
            const imageData = context.createImageData(width, height);
            const alpha = 35;

            for (let index = 0; index < imageData.data.length; index += 4) {
                const value = Math.random() * 255;
                imageData.data[index] = value;
                imageData.data[index + 1] = value;
                imageData.data[index + 2] = value;
                imageData.data[index + 3] = alpha;
            }

            return imageData;
        }

        function resize() {
            const parent = canvas.parentElement;
            width = parent?.clientWidth || window.innerWidth;
            height = parent?.clientHeight || 500;
            canvas.width = width;
            canvas.height = height;
            pointer.x = width / 2;
            pointer.y = height / 2;
            grainImage = generateGrain();
        }

        function draw() {
            if (!grainImage) {
                return;
            }

            context.clearRect(0, 0, width, height);
            context.putImageData(grainImage, 0, 0);

            const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 600);
            gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');

            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            frameId = window.requestAnimationFrame(draw);
        }

        function handleMove(event: MouseEvent) {
            const rect = canvas.getBoundingClientRect();
            pointer.x = event.clientX - rect.left;
            pointer.y = event.clientY - rect.top;
        }

        function handleLeave() {
            pointer.x = width / 2;
            pointer.y = height / 2;
        }

        resize();
        draw();

        if (!prefersReducedMotion) {
            window.addEventListener('mousemove', handleMove);
            canvas.addEventListener('mouseleave', handleLeave);
        }

        window.addEventListener('resize', resize);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('mouseleave', handleLeave);
        };
    }, []);

    return <canvas ref={canvasRef} className={styles.scene} aria-hidden="true" />;
}

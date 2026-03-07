import React from 'react';
import AiAssistant from '../components/AiAssistant';

// Swizzle Docusaurus Root to inject AI Assistant globally
export default function Root({ children }) {
    return (
        <>
            {children}
            <AiAssistant />
        </>
    );
}

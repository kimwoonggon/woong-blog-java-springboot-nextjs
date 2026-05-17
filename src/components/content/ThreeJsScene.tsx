"use client"

import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

function RotatingCube() {
    const meshRef = useRef<THREE.Mesh | null>(null)

    useFrame((state, delta) => {
        if (!meshRef.current) {
            return
        }

        meshRef.current.rotation.x += delta * 0.5
        meshRef.current.rotation.y += delta * 0.2
    })

    return (
        <Box ref={meshRef} args={[1, 1, 1]}>
            <meshStandardMaterial color="#F3434F" />
        </Box>
    )
}

export function ThreeJsScene({ height = 300 }: { height?: number }) {
    return (
        <div
            className="w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800"
            style={{ height: `${height}px` }}
        >
            <Canvas camera={{ position: [3, 3, 3], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <RotatingCube />
                <Environment preset="city" />
                <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                <OrbitControls enableZoom={false} makeDefault />
            </Canvas>
        </div>
    )
}

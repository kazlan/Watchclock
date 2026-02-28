import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Body, SearchAltitude, MoonPhase, Equator, Horizon, Observer } from 'astronomy-engine';
import starsData from '../../data/stars.json';
import constellationsData from '../../data/constellations.json';
import constellationNames from '../../data/constellationNames.json';

// Utility to convert Altitude & Azimuth to 3D Sphere Cartesian
// Alt: 0 is horizon, 90 is zenith.
// Az: 0 is North, 90 East, 180 South, 270 West.
function getCartesian(alt, az, radius = 50) {
    // Convert to radians
    const rAlt = alt * (Math.PI / 180);
    const rAz = az * (Math.PI / 180);

    // Standard spherical coordinates to Cartesian for Three.js
    // Y is Up in ThreeJS, so Y = radius * sin(alt)
    // Z is "forward/backward", X is "left/right"
    // Let's map North (Az=0) to -Z, East (Az=90) to +X, South to +Z, West to -X
    const y = radius * Math.sin(rAlt);
    const rXY = radius * Math.cos(rAlt);

    // Using mapping where Az=0 -> -Z
    const x = rXY * Math.sin(rAz);
    const z = -rXY * Math.cos(rAz);

    return [x, y, z];
}

const StarField = ({ location, date }) => {
    // Generate star positions efficiently
    const [positions, sizes] = useMemo(() => {
        const obs = new Observer(location.latitude, location.longitude, 0);

        const posArray = [];
        const sizeArray = [];

        starsData.forEach(star => {


            const hor = Horizon(date, obs, star.ra, star.dec, "normal");

            // Only plot if above horizon (altitude > 0)
            if (hor.altitude > 0) {
                const [x, y, z] = getCartesian(hor.altitude, hor.azimuth, 48);
                posArray.push(x, y, z);

                // Brighter stars (lower magnitude) get larger sizes
                // mag ranges from ~ -1.5 (bright) to 5.0 (dim)
                const pointSize = Math.max(0.5, (5.0 - star.mag) * 0.5);
                sizeArray.push(pointSize);
            }
        });

        return [new Float32Array(posArray), new Float32Array(sizeArray)];
    }, [location, date]);

    if (positions.length === 0) return null;

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-size"
                    count={sizes.length}
                    array={sizes}
                    itemSize={1}
                />
            </bufferGeometry>
            <pointsMaterial
                size={1.5}
                color="#ffffff"
                transparent
                opacity={0.8}
                sizeAttenuation={true}
            />
        </points>
    );
};

const Constellations = ({ location, date }) => {
    // constellationsData is an array of lines.
    // Each line is an array of points [ra, dec].
    const lines = useMemo(() => {
        const obs = new Observer(location.latitude, location.longitude, 0);
        const activeLines = [];

        constellationsData.forEach(lineSegment => {
            const points3D = [];
            let allBelowHorizon = true;

            for (const pt of lineSegment) {
                const ra = pt[0];
                const dec = pt[1];

                const hor = Horizon(date, obs, ra, dec, "normal");

                // If the entire constellation segment is below horizon, we don't draw it.
                // But if parts are above, we draw the points (even slightly below to connect).
                if (hor.altitude > -5) {
                    allBelowHorizon = false;
                }

                const [x, y, z] = getCartesian(hor.altitude, hor.azimuth, 48);
                points3D.push(new THREE.Vector3(x, y, z));
            }

            if (!allBelowHorizon && points3D.length > 1) {
                activeLines.push(points3D);
            }
        });

        return activeLines;
    }, [location, date]);

    if (lines.length === 0) return null;

    return (
        <group>
            {lines.map((pts, i) => (
                <line key={`const-${i}`}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={pts.length}
                            array={new Float32Array(pts.flatMap(p => [p.x, p.y, p.z]))}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color="rgba(255,255,255,0.15)" linewidth={1} transparent />
                </line>
            ))}
        </group>
    );
};

const ConstellationLabels = ({ location, date }) => {
    const labels = useMemo(() => {
        const obs = new Observer(location.latitude, location.longitude, 0);
        const visible = [];

        constellationNames.forEach(c => {
            const hor = Horizon(date, obs, c.ra, c.dec, "normal");
            if (hor.altitude > 5) {
                const [x, y, z] = getCartesian(hor.altitude, hor.azimuth, 46);
                visible.push({ name: c.name, pos: [x, y, z], alt: hor.altitude });
            }
        });

        return visible;
    }, [location, date]);

    if (labels.length === 0) return null;

    return (
        <group>
            {labels.map((label) => (
                <Billboard key={label.name} position={label.pos} follow lockX={false} lockY={false} lockZ={false}>
                    <Text
                        fontSize={1.2}
                        color="#8ba4c7"
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.06}
                        outlineColor="#0b111a"
                        fillOpacity={Math.min(0.85, label.alt / 30)}
                    >
                        {label.name}
                    </Text>
                </Billboard>
            ))}
        </group>
    );
};

const Planet = ({ body, location, date, color, size, name }) => {
    const { alt, pos } = useMemo(() => {
        try {
            const obs = new Observer(location.latitude, location.longitude, 0);
            const eq = Equator(body, date, obs, true, true);
            const hor = Horizon(date, obs, eq.ra, eq.dec, "normal");
            return {
                alt: hor.altitude,
                pos: getCartesian(hor.altitude, hor.azimuth, 45)
            };
        } catch (e) {
            console.error("Planet Calc Error:", e);
            return { alt: -1, pos: [0, -100, 0] };
        }
    }, [location, date, body]);

    if (alt <= 0) return null; // Below horizon

    return (
        <group position={pos}>
            <mesh>
                <sphereGeometry args={[size, 16, 16]} />
                <meshBasicMaterial color={color} />
            </mesh>
            {/* Planet Label */}
            <Billboard position={[0, -size - 0.8, 0]} follow lockX={false} lockY={false} lockZ={false}>
                <Text
                    fontSize={0.9}
                    color={color}
                    anchorX="center"
                    anchorY="top"
                    outlineWidth={0.05}
                    outlineColor="#0b111a"
                >
                    {name}
                </Text>
            </Billboard>
        </group>
    );
};

export default function Scene({ location, date }) {
    if (!location) return null;

    return (
        <Canvas camera={{ position: [0, 15, 60], fov: 60 }}>
            <ambientLight intensity={0.5} />

            <OrbitControls
                enablePan={false}
                maxPolarAngle={Math.PI / 2} // Don't allow camera to go below ground
                minDistance={10}
                maxDistance={80}
            />

            {/* The Ground / Horizon */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <circleGeometry args={[50, 64]} />
                <meshBasicMaterial color="#0b111a" transparent opacity={0.6} />
            </mesh>

            {/* Azimuth / Cardinal Direction Markers */}
            {['N', 'E', 'S', 'W'].map((dir, i) => {
                const angle = (i * 90) * (Math.PI / 180);
                const x = 50 * Math.sin(angle);
                const z = -50 * Math.cos(angle);
                return (
                    <mesh key={dir} position={[x, 0.5, z]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[1, 16]} />
                        <meshBasicMaterial color="#4a5568" />
                    </mesh>
                );
            })}

            {/* Starfield mapping */}
            <StarField location={location} date={date} />

            {/* Constellation Lines */}
            <Constellations location={location} date={date} />

            {/* Constellation Labels */}
            <ConstellationLabels location={location} date={date} />

            {/* Planetas y Luminarias */}
            <Planet body={Body.Sun} name="Sol" location={location} date={date} color="#fbbf24" size={2} />
            <Planet body={Body.Moon} name="Luna" location={location} date={date} color="#e2e8f0" size={1.8} />
            <Planet body={Body.Venus} name="Venus" location={location} date={date} color="#fcd34d" size={0.8} />
            <Planet body={Body.Mars} name="Marte" location={location} date={date} color="#ef4444" size={0.6} />
            <Planet body={Body.Jupiter} name="Júpiter" location={location} date={date} color="#fdba74" size={1.2} />
            <Planet body={Body.Saturn} name="Saturno" location={location} date={date} color="#fde68a" size={1.0} />

            {/* Ambient subtle grid */}
            <gridHelper args={[100, 20, '#1e293b', '#0f172a']} position={[0, -0.4, 0]} />
            <polarGridHelper args={[50, 16, 8, 64, '#1e293b', '#0f172a']} position={[0, -0.3, 0]} />
        </Canvas>
    );
}

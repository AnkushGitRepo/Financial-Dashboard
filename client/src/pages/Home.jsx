import React from "react";
import Hero from "../components/Hero";
import MarketIndices from "../components/MarketIndices";
import "../styles/Home.css";

const Home = () => {
  return (
    <>
      <div className="home-hero-section">
        <div className="pattern-bg">
          <svg className="cube-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <filter id="noiseFilter">
                <feTurbulence 
                  type="fractalNoise" 
                  baseFrequency="0.65" 
                  numOctaves="3" 
                  stitchTiles="stitch"
                />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="0.1" />
          </svg>
          <h1 className="home-title">MarketMitra</h1>
        </div>
      </div>
      <MarketIndices />
    </>
  );
};

export default Home;
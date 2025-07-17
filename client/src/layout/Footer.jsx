import React from 'react';
import '../styles/Footer.css';
import { FaGithub, FaLinkedin, FaEnvelope, FaInstagram } from 'react-icons/fa';

const teamMembers = [
  {
    name: 'Ankush',
    socials: {
      linkedin: 'https://www.linkedin.com/in/ankushgupta18/',
      github: 'https://github.com/AnkushGitRepo',
      email: 'mailto:ankushgupta1806@gmail.com',
      instagram: 'https://www.instagram.com/_ankushg/',
    },
  },
  {
    name: 'Vishwa',
    socials: {
      linkedin: 'https://www.linkedin.com/',
      github: 'https://github.com/Vishwashah1010',
      email: 'mailto:ankushgupta1806@gmail.com',
      instagram: 'https://www.instagram.com/_ankushg/',
    },
  },
  {
    name: 'Nirjar',
    socials: {
      linkedin: 'https://www.linkedin.com/',
      github: 'https://github.com/Nirjar21',
      email: 'mailto:ankushgupta1806@gmail.com',
      instagram: 'https://www.instagram.com/_ankushg/',
    },
  },
  {
    name: 'Kaunen',
    socials: {
      linkedin: 'https://www.linkedin.com/',
      github: 'https://github.com/KaunenVahora08',
      email: 'mailto:ankushgupta1806@gmail.com',
      instagram: 'https://www.instagram.com/_ankushg/',
    },
  },
  {
    name: 'Malav',
    socials: {
      linkedin: 'https://www.linkedin.com/',
      github: 'https://github.com/Malav-coder',
      email: 'mailto:ankushgupta1806@gmail.com',
      instagram: 'https://www.instagram.com/_ankushg/',
    },
  }
];

const Footer = ({ isSidebarCollapsed }) => {
  return (
    <footer className={`footer ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-about">
            <h2>MarketMitra</h2>
            <p>Your trusted partner in financial markets.</p>
          </div>
          <div className="footer-links">
            <h3>Important Links</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/stocks">Stocks</a></li>
              <li><a href="/markets">Markets</a></li>
              <li><a href="/ipo-calendar">IPO Calendar</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-team">
          <h3>Meet the Team</h3>
          <div className="team-members">
            {teamMembers.map((member, index) => (
              <div key={index} className="team-member">
                <h4>{member.name}</h4>
                <div className="social-icons">
                  <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer"><FaLinkedin /></a>
                  <a href={member.socials.github} target="_blank" rel="noopener noreferrer"><FaGithub /></a>
                  <a href={member.socials.email}><FaEnvelope /></a>
                  <a href={member.socials.instagram} target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} MarketMitra. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;


import React from 'react';
import { MdBlock, MdApps, MdWeb, MdVideoLibrary } from 'react-icons/md';
import { IoPlay, IoInfinite } from 'react-icons/io5';
import { AiFillInstagram, AiFillYoutube } from 'react-icons/ai';

const Blocking: React.FC = () => {
  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      color: '#ffffff'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <MdBlock size={32} color="#ff6b6b" />
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          margin: 0,
          background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Blocking Features
        </h1>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        
        {/* Permanent Blocking */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 142, 142, 0.1))',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <IoInfinite size={24} color="#ff6b6b" />
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              margin: 0,
              color: '#ff6b6b'
            }}>
              Permanent Blocking
            </h2>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <MdApps size={20} color="#ccc" />
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '500',
                margin: 0,
                color: '#fff'
              }}>
                Block Any Application
              </h3>
            </div>
            <p style={{
              fontSize: '0.9rem',
              color: '#ccc',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Permanently block access to any installed application on your system
            </p>
          </div>

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <MdWeb size={20} color="#ccc" />
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '500',
                margin: 0,
                color: '#fff'
              }}>
                Block Any Website/URL
              </h3>
            </div>
            <p style={{
              fontSize: '0.9rem',
              color: '#ccc',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Block access to specific websites, domains, or URLs permanently
            </p>
          </div>
        </div>

        {/* Focus Session Blocking */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(106, 90, 205, 0.1), rgba(147, 112, 219, 0.1))',
          border: '1px solid rgba(106, 90, 205, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <IoPlay size={24} color="#6a5acd" />
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              margin: 0,
              color: '#6a5acd'
            }}>
              Focus Session Blocking
            </h2>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <MdApps size={20} color="#ccc" />
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '500',
                margin: 0,
                color: '#fff'
              }}>
                Temporary App Blocking
              </h3>
            </div>
            <p style={{
              fontSize: '0.9rem',
              color: '#ccc',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Block specific apps only during your focus sessions
            </p>
          </div>

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <MdWeb size={20} color="#ccc" />
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '500',
                margin: 0,
                color: '#fff'
              }}>
                Focus-Only URL Blocking
              </h3>
            </div>
            <p style={{
              fontSize: '0.9rem',
              color: '#ccc',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Block distracting websites only when you're in a focus session
            </p>
          </div>
        </div>

        {/* In-App Feature Blocking */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.1), rgba(255, 140, 0, 0.1))',
          border: '1px solid rgba(255, 165, 0, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(10px)',
          gridColumn: 'span 2'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <MdVideoLibrary size={24} color="#ffa500" />
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              margin: 0,
              color: '#ffa500'
            }}>
              In-App Feature Blocking
            </h2>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <AiFillYoutube size={20} color="#ff0000" />
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  margin: 0,
                  color: '#fff'
                }}>
                  YouTube Shorts
                </h3>
              </div>
              <p style={{
                fontSize: '0.9rem',
                color: '#ccc',
                margin: 0,
                lineHeight: '1.4'
              }}>
                Block YouTube Shorts permanently or only during focus sessions
              </p>
            </div>

            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <AiFillInstagram size={20} color="#e4405f" />
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  margin: 0,
                  color: '#fff'
                }}>
                  Instagram Reels
                </h3>
              </div>
              <p style={{
                fontSize: '0.9rem',
                color: '#ccc',
                margin: 0,
                lineHeight: '1.4'
              }}>
                Block Instagram Reels permanently or only during focus sessions
              </p>
            </div>
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255, 165, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 165, 0, 0.2)'
          }}>
            <p style={{
              fontSize: '0.9rem',
              color: '#ffa500',
              margin: 0,
              fontWeight: '500'
            }}>
              💡 Smart Feature Detection: Automatically identify and block time-wasting features within popular apps
            </p>
          </div>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(123, 97, 255, 0.1), rgba(147, 112, 219, 0.1))',
        border: '1px solid rgba(123, 97, 255, 0.3)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          margin: '0 0 1rem 0',
          color: '#7b61ff'
        }}>
          Coming Soon
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#ccc',
          margin: 0,
          lineHeight: '1.5'
        }}>
          This powerful blocking system is currently in development. Stay tuned for the complete implementation 
          that will give you ultimate control over your digital environment and help you maintain focus.
        </p>
      </div>
    </div>
  );
};

export default Blocking;

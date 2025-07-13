import { useEffect, useState } from 'react';
import { MdEdit } from 'react-icons/md';
import Questionnaire from '../../components/questionnaire/Questionnaire';

const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  const loadUserData = async () => {
    try {
      const result = await window.electronAPI.getUserData();
      if (result.success && result.userData) {
        setUser(result.userData);
      }
      
      // Load questionnaire data
      const questionnaireData = await window.electronAPI.getUserInfoLocal();
      if (questionnaireData) {
        setUserInfo(questionnaireData);
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setShowQuestionnaire(true);
  };

  const handleQuestionnaireComplete = async (data: any) => {
    try {
      await window.electronAPI.storeUserInfo(data);
      setUserInfo(data);
      setShowQuestionnaire(false);
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  const handleQuestionnaireSkip = () => {
    setShowQuestionnaire(false);
    setIsEditingProfile(false);
  };

  useEffect(() => {
    loadUserData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '200px'
      }}>
        <p style={{ color: 'white' }}>Loading...</p>
      </div>
    );
  }

  if (showQuestionnaire) {
    return (
      <Questionnaire
        userId={user?.id}
        userName={user?.name}
        onComplete={handleQuestionnaireComplete}
        onSkip={handleQuestionnaireSkip}
      />
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: 'white' }}>Profile Information</h3>
        {user && (
          <button
            onClick={handleEditProfile}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '500'
            }}
          >
            <MdEdit size={16} />
            Edit Profile
          </button>
        )}
      </div>

      {user ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
            {user.picture && (
              <img 
                src={user.picture} 
                alt="Profile" 
                style={{ width: '80px', height: '80px', borderRadius: '50%' }}
              />
            )}
            <div>
              <h4 style={{ margin: 0, color: 'white', fontSize: '20px' }}>
                {userInfo?.name || user.name}
              </h4>
              <p style={{ margin: '5px 0', color: '#aaa', fontSize: '16px' }}>{user.email}</p>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>ID: {user.id}</p>
            </div>
          </div>
          
          {userInfo ? (
            <div>
              <h4 style={{ color: 'white', marginBottom: '15px' }}>Questionnaire Information</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '20px' 
              }}>
                <div style={{ 
                  backgroundColor: '#0a0a0a', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h5 style={{ color: '#4CAF50', margin: '0 0 10px 0' }}>Work Information</h5>
                  <p><strong>Job Role:</strong> {userInfo.job_role}</p>
                  <p><strong>Team Mode:</strong> {userInfo.team_mode}</p>
                  <p><strong>Daily Work Hours:</strong> {userInfo.daily_work_hours}</p>
                  <p><strong>Work Type:</strong> {Array.isArray(userInfo.work_type) ? userInfo.work_type.join(', ') : userInfo.work_type}</p>
                </div>
                
                <div style={{ 
                  backgroundColor: '#0a0a0a', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h5 style={{ color: '#FF9800', margin: '0 0 10px 0' }}>Distraction Patterns</h5>
                  <p><strong>Distraction Time:</strong> {userInfo.distraction_time}</p>
                  <p><strong>Distraction Apps:</strong> {Array.isArray(userInfo.distraction_apps) ? userInfo.distraction_apps.join(', ') : userInfo.distraction_apps}</p>
                  <p><strong>Content Types:</strong> {Array.isArray(userInfo.distraction_content_types) ? userInfo.distraction_content_types.join(', ') : userInfo.distraction_content_types}</p>
                </div>
                
                <div style={{ 
                  backgroundColor: '#0a0a0a', 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h5 style={{ color: '#2196F3', margin: '0 0 10px 0' }}>Goals & Preferences</h5>
                  <p><strong>Productivity Goal:</strong> {userInfo.productivity_goal}</p>
                  <p><strong>Enforcement Preference:</strong> {userInfo.enforcement_preference}</p>
                  <p><strong>Referral Source:</strong> {userInfo.referralSource}</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#0a0a0a', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#FF9800', margin: '0 0 15px 0' }}>Complete Your Profile</h4>
              <p style={{ color: '#aaa', marginBottom: '15px' }}>
                Help us personalize your experience by completing the questionnaire.
              </p>
              <button
                onClick={handleEditProfile}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Complete Profile
              </button>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: '#aaa' }}>Please log in to view your profile information.</p>
      )}
    </div>
  );
};

export default ProfilePage;

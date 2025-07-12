import { useState } from 'react';
import styles from './questionnaire.module.css';

interface QuestionnaireProps {
  userId: string;
  userName: string;
  onComplete: (data: QuestionnaireData) => void;
  onSkip?: () => void;
}

interface QuestionnaireData {
  userId: string;
  name: string;
  job_role: string;
  referralSource: string;
  work_type: string[];
  team_mode: string;
  daily_work_hours: string;
  distraction_apps: string[];
  distraction_content_types: string[];
  distraction_time: string;
  productivity_goal: string;
  enforcement_preference: string;
}

const JOB_ROLES = [
  'Accountant', 'Analyst', 'Artist', 'Business owner', 'Consultant', 
  'Content creator', 'Designer', 'Doctor', 'Engineer', 'Executive', 
  'Founder', 'Lawyer', 'Manager', 'Product manager', 'Researcher',
  'Sales', 'Software developer', 'Student', 'Teacher', 'Trader', 
  'Video editor', 'Writer', 'Other'
];

const REFERRAL_SOURCES = [
  'LinkedIn', 'Discord', 'Reddit', 'Friend', 'Blog', 'Other'
];

const WORK_TYPES = [
  'Software Development', 'Design', 'Marketing', 'Writing', 
  'Studying', 'Customer Support', 'Other'
];

const TEAM_MODES = [
  'Solo', 'In a team', 'Both'
];

const WORK_HOURS = [
  'Less than 2', '2–4', '4–6', '6–8', 'More than 8'
];

const DISTRACTION_APPS = [
  'YouTube', 'Instagram', 'Twitter/X', 'WhatsApp', 'Telegram', 
  'Netflix', 'News sites', 'Reddit', 'Other'
];

const DISTRACTION_CONTENT = [
  'Short videos (Reels, Shorts)', 'Long videos', 'Social Media posts', 
  'Chat messages', 'News articles', 'Shopping or browsing products', 'Other'
];

const DISTRACTION_TIMES = [
  'Morning', 'Afternoon', 'Evening', 'Night', 'Varies'
];

const PRODUCTIVITY_GOALS = [
  'Get more deep work done',
  'Study with fewer distractions',
  'Stay off social media during work hours',
  'Complete tasks/projects on time',
  'Track where my time goes'
];

const ENFORCEMENT_PREFERENCES = [
  'Yes, strictly',
  'Yes, gently',
  'No, just let me know',
  'Not sure yet'
];

export default function Questionnaire({ userId, userName, onComplete, onSkip }: QuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [customInputs, setCustomInputs] = useState({
    job_role: '',
    referralSource: '',
    work_type: '',
    distraction_apps: '',
    distraction_content_types: ''
  });

  const [formData, setFormData] = useState<QuestionnaireData>({
    userId,
    name: userName,
    job_role: '',
    referralSource: '',
    work_type: [],
    team_mode: '',
    daily_work_hours: '',
    distraction_apps: [],
    distraction_content_types: [],
    distraction_time: '',
    productivity_goal: '',
    enforcement_preference: ''
  });

  const totalSteps = 10;
  const progress = (currentStep / totalSteps) * 100;

  const handleInputChange = (field: keyof QuestionnaireData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleMultiSelect = (field: 'work_type' | 'distraction_apps' | 'distraction_content_types', value: string) => {
    const currentValues = formData[field] as string[];
    
    if (value === 'Other') {
      const customValue = customInputs[field];
      if (customValue.trim()) {
        const newValues = currentValues.includes(customValue) 
          ? currentValues.filter(v => v !== customValue)
          : [...currentValues, customValue];
        handleInputChange(field, newValues);
      }
    } else {
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      handleInputChange(field, newValues);
    }
  };

  const handleCustomInputChange = (field: keyof typeof customInputs, value: string) => {
    setCustomInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1: return formData.name.trim() !== '';
      case 2: return formData.job_role !== '';
      case 3: return formData.referralSource !== '';
      case 4: return formData.work_type.length > 0;
      case 5: return formData.team_mode !== '';
      case 6: return formData.daily_work_hours !== '';
      case 7: return formData.distraction_apps.length > 0;
      case 8: return formData.distraction_content_types.length > 0;
      case 9: return formData.distraction_time !== '';
      case 10: return formData.productivity_goal !== '' && formData.enforcement_preference !== '';
      default: return false;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit();
      }
    } else {
      setError('Please complete all required fields before continuing.');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.storeUserInfo(formData);
      
      if (result.success) {
        onComplete(formData);
      } else {
        setError(result.error || 'Failed to save your information. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Error submitting questionnaire:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>Full Name</label>
            <input
              type="text"
              className={styles.input}
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
        );

      case 2:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>Job Title</label>
            <select
              className={styles.select}
              value={formData.job_role}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'Other') {
                  handleInputChange('job_role', customInputs.job_role || '');
                } else {
                  handleInputChange('job_role', value);
                }
              }}
            >
              <option value="">Select your job title</option>
              {JOB_ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            {formData.job_role === 'Other' || (formData.job_role !== '' && !JOB_ROLES.includes(formData.job_role)) ? (
              <input
                type="text"
                className={`${styles.input} ${styles.customInput}`}
                value={customInputs.job_role}
                onChange={(e) => {
                  handleCustomInputChange('job_role', e.target.value);
                  handleInputChange('job_role', e.target.value);
                }}
                placeholder="Please specify your job title"
              />
            ) : null}
          </div>
        );

      case 3:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>Where did you hear about us?</label>
            <select
              className={styles.select}
              value={formData.referralSource}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'Other') {
                  handleInputChange('referralSource', customInputs.referralSource || '');
                } else {
                  handleInputChange('referralSource', value);
                }
              }}
            >
              <option value="">Select source</option>
              {REFERRAL_SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
            {formData.referralSource === 'Other' || (formData.referralSource !== '' && !REFERRAL_SOURCES.includes(formData.referralSource)) ? (
              <input
                type="text"
                className={`${styles.input} ${styles.customInput}`}
                value={customInputs.referralSource}
                onChange={(e) => {
                  handleCustomInputChange('referralSource', e.target.value);
                  handleInputChange('referralSource', e.target.value);
                }}
                placeholder="Please specify"
              />
            ) : null}
          </div>
        );

      case 4:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>What type of work do you usually do? (Select all that apply)</label>
            <div className={styles.checkboxGroup}>
              {WORK_TYPES.map(type => (
                <div key={type} className={styles.checkboxItem} onClick={() => handleMultiSelect('work_type', type)}>
                  <div className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.work_type.includes(type)}
                      onChange={() => handleMultiSelect('work_type', type)}
                    />
                    <span className={styles.checkmark}></span>
                  </div>
                  <span className={styles.checkboxLabel}>{type}</span>
                </div>
              ))}
            </div>
            {formData.work_type.includes('Other') || formData.work_type.some(type => !WORK_TYPES.includes(type)) ? (
              <input
                type="text"
                className={`${styles.input} ${styles.customInput}`}
                value={customInputs.work_type}
                onChange={(e) => {
                  handleCustomInputChange('work_type', e.target.value);
                  if (e.target.value.trim()) {
                    handleMultiSelect('work_type', 'Other');
                  }
                }}
                placeholder="Please specify other work type"
              />
            ) : null}
          </div>
        );

      case 5:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>Do you work solo or in a team?</label>
            <div className={styles.radioGroup}>
              {TEAM_MODES.map(mode => (
                <div key={mode} className={styles.radioItem} onClick={() => handleInputChange('team_mode', mode)}>
                  <div className={styles.radio}>
                    <input
                      type="radio"
                      name="team_mode"
                      checked={formData.team_mode === mode}
                      onChange={() => handleInputChange('team_mode', mode)}
                    />
                    <span className={styles.radiomark}></span>
                  </div>
                  <span className={styles.radioLabel}>{mode}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>How many hours a day do you usually work on your system?</label>
            <div className={styles.radioGroup}>
              {WORK_HOURS.map(hours => (
                <div key={hours} className={styles.radioItem} onClick={() => handleInputChange('daily_work_hours', hours)}>
                  <div className={styles.radio}>
                    <input
                      type="radio"
                      name="daily_work_hours"
                      checked={formData.daily_work_hours === hours}
                      onChange={() => handleInputChange('daily_work_hours', hours)}
                    />
                    <span className={styles.radiomark}></span>
                  </div>
                  <span className={styles.radioLabel}>{hours}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 7:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>Which of the following apps/websites distract you the most? (Select all that apply)</label>
            <div className={styles.checkboxGroup}>
              {DISTRACTION_APPS.map(app => (
                <div key={app} className={styles.checkboxItem} onClick={() => handleMultiSelect('distraction_apps', app)}>
                  <div className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.distraction_apps.includes(app)}
                      onChange={() => handleMultiSelect('distraction_apps', app)}
                    />
                    <span className={styles.checkmark}></span>
                  </div>
                  <span className={styles.checkboxLabel}>{app}</span>
                </div>
              ))}
            </div>
            {formData.distraction_apps.includes('Other') || formData.distraction_apps.some(app => !DISTRACTION_APPS.includes(app)) ? (
              <input
                type="text"
                className={`${styles.input} ${styles.customInput}`}
                value={customInputs.distraction_apps}
                onChange={(e) => {
                  handleCustomInputChange('distraction_apps', e.target.value);
                  if (e.target.value.trim()) {
                    handleMultiSelect('distraction_apps', 'Other');
                  }
                }}
                placeholder="Please specify other apps/websites"
              />
            ) : null}
          </div>
        );

      case 8:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>What kind of content distracts you the most? (Select all that apply)</label>
            <div className={styles.checkboxGroup}>
              {DISTRACTION_CONTENT.map(content => (
                <div key={content} className={styles.checkboxItem} onClick={() => handleMultiSelect('distraction_content_types', content)}>
                  <div className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.distraction_content_types.includes(content)}
                      onChange={() => handleMultiSelect('distraction_content_types', content)}
                    />
                    <span className={styles.checkmark}></span>
                  </div>
                  <span className={styles.checkboxLabel}>{content}</span>
                </div>
              ))}
            </div>
            {formData.distraction_content_types.includes('Other') || formData.distraction_content_types.some(content => !DISTRACTION_CONTENT.includes(content)) ? (
              <input
                type="text"
                className={`${styles.input} ${styles.customInput}`}
                value={customInputs.distraction_content_types}
                onChange={(e) => {
                  handleCustomInputChange('distraction_content_types', e.target.value);
                  if (e.target.value.trim()) {
                    handleMultiSelect('distraction_content_types', 'Other');
                  }
                }}
                placeholder="Please specify other content types"
              />
            ) : null}
          </div>
        );

      case 9:
        return (
          <div className={styles.questionGroup}>
            <label className={styles.questionLabel}>When do you get distracted the most?</label>
            <div className={styles.radioGroup}>
              {DISTRACTION_TIMES.map(time => (
                <div key={time} className={styles.radioItem} onClick={() => handleInputChange('distraction_time', time)}>
                  <div className={styles.radio}>
                    <input
                      type="radio"
                      name="distraction_time"
                      checked={formData.distraction_time === time}
                      onChange={() => handleInputChange('distraction_time', time)}
                    />
                    <span className={styles.radiomark}></span>
                  </div>
                  <span className={styles.radioLabel}>{time}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 10:
        return (
          <div className={styles.questionGroup}>
            <div style={{ marginBottom: '24px' }}>
              <label className={styles.questionLabel}>What&apos;s your main productivity goal right now?</label>
              <div className={styles.radioGroup}>
                {PRODUCTIVITY_GOALS.map(goal => (
                  <div key={goal} className={styles.radioItem} onClick={() => handleInputChange('productivity_goal', goal)}>
                    <div className={styles.radio}>
                      <input
                        type="radio"
                        name="productivity_goal"
                        checked={formData.productivity_goal === goal}
                        onChange={() => handleInputChange('productivity_goal', goal)}
                      />
                      <span className={styles.radiomark}></span>
                    </div>
                    <span className={styles.radioLabel}>{goal}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className={styles.questionLabel}>Would you like Tymli to help enforce your focus rules?</label>
              <div className={styles.radioGroup}>
                {ENFORCEMENT_PREFERENCES.map(pref => (
                  <div key={pref} className={styles.radioItem} onClick={() => handleInputChange('enforcement_preference', pref)}>
                    <div className={styles.radio}>
                      <input
                        type="radio"
                        name="enforcement_preference"
                        checked={formData.enforcement_preference === pref}
                        onChange={() => handleInputChange('enforcement_preference', pref)}
                      />
                      <span className={styles.radiomark}></span>
                    </div>
                    <span className={styles.radioLabel}>{pref}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.questionnaireContainer}>
      <div className={styles.questionnaireCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to Hourglass!</h1>
          <p className={styles.subtitle}>Help us personalize your experience</p>
        </div>

        <div className={styles.stepIndicator}>
          Step {currentStep} of {totalSteps}
        </div>

        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>

        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.fadeIn}>
            {renderStep()}
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.buttonGroup}>
            {currentStep > 1 && (
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handlePrevious}
                disabled={isLoading}
              >
                Previous
              </button>
            )}
            
            <button
              type="button"
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={handleNext}
              disabled={isLoading || !validateStep()}
            >
              {isLoading ? (
                <div className={styles.loadingSpinner} />
              ) : currentStep === totalSteps ? (
                'Complete Setup'
              ) : (
                'Next'
              )}
            </button>
            
            {onSkip && currentStep === 1 && (
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip for now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

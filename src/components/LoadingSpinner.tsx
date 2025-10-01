import React from 'react';
import { Loader2, FileText, Brain, Cog, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoadingSpinnerProps {
  stage: 'uploading' | 'extracting' | 'analyzing' | 'primary' | 'valves' | 'electrical' | 'hvac' | 'combining' | 'finalizing' | 'primary_analysis' | 'valve_and_pump_focus' | 'electrical_and_control_focus' | 'hvac_and_mechanical_focus' | 'completed' | 'idle';
  progress?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ stage, progress = 0 }) => {
  const { t } = useLanguage();

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'uploading':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'extracting':
        return <FileText className="w-6 h-6 text-orange-500" />;
      case 'analyzing':
      case 'primary':
      case 'valves':
      case 'electrical':
      case 'hvac':
      case 'primary_analysis':
      case 'valve_and_pump_focus':
      case 'electrical_and_control_focus':
      case 'hvac_and_mechanical_focus':
        return <Brain className="w-6 h-6 text-purple-500" />;
      case 'combining':
        return <Cog className="w-6 h-6 text-green-500" />;
      case 'finalizing':
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'idle':
        return <Loader2 className="w-6 h-6 text-gray-500" />;
      default:
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'uploading':
        return t('loading.uploading');
      case 'extracting':
        return t('loading.extracting');
      case 'analyzing':
        return t('loading.analyzing');
      case 'primary':
      case 'primary_analysis':
        return t('loading.primary');
      case 'valves':
      case 'valve_and_pump_focus':
        return t('loading.valves');
      case 'electrical':
      case 'electrical_and_control_focus':
        return t('loading.electrical');
      case 'hvac':
      case 'hvac_and_mechanical_focus':
        return t('loading.hvac');
      case 'combining':
        return t('loading.combining');
      case 'finalizing':
        return t('loading.finalizing');
      case 'completed':
        return 'Analysis Complete!';
      case 'idle':
        return 'Ready';
      default:
        return t('main.loading');
    }
  };

  const getProgressColor = (stage: string) => {
    switch (stage) {
      case 'uploading':
        return 'bg-blue-500';
      case 'extracting':
        return 'bg-orange-500';
      case 'analyzing':
      case 'primary':
      case 'valves':
      case 'electrical':
      case 'hvac':
      case 'primary_analysis':
      case 'valve_and_pump_focus':
      case 'electrical_and_control_focus':
      case 'hvac_and_mechanical_focus':
        return 'bg-purple-500';
      case 'combining':
        return 'bg-green-500';
      case 'finalizing':
      case 'completed':
        return 'bg-green-600';
      case 'idle':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 relative">
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          {getStageIcon(stage)}
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {getStageText(stage)}
        </h3>
        
        {progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{t('loading.progress')}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(stage)}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500">
          {stage === 'uploading' && 'Bitte warten Sie, während Ihre Datei hochgeladen wird...'}
          {stage === 'extracting' && 'PDF-Inhalt wird extrahiert und vorbereitet...'}
          {stage === 'analyzing' && 'KI analysiert Ihre technische Zeichnung...'}
          {stage === 'primary' && 'Umfassende Hauptanalyse wird durchgeführt...'}
          {stage === 'valves' && 'Spezialisierte Erkennung von Ventilen und Pumpen...'}
          {stage === 'electrical' && 'Elektrische und Steuerungskomponenten werden identifiziert...'}
          {stage === 'hvac' && 'HLK- und mechanische Komponenten werden erkannt...'}
          {stage === 'combining' && 'Alle Analyseergebnisse werden zusammengeführt...'}
          {stage === 'finalizing' && 'Stückliste wird erstellt und formatiert...'}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

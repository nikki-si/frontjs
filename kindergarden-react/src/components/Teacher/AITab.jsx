import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AITab = ({ groupId }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadPrediction();
    }
  }, [groupId]);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const data = await api.getAIPrediction(groupId);
      setPrediction(data);
    } catch (error) {
      console.error('Ошибка загрузки AI прогноза:', error);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (risk) => {
    const r = (risk || 'medium').toLowerCase();
    if (r === 'low') return 'risk-low';
    if (r === 'high') return 'risk-high';
    return 'risk-medium';
  };

  const getRiskText = (risk) => {
    const r = (risk || 'medium').toLowerCase();
    if (r === 'low') return 'Низкий';
    if (r === 'high') return 'Высокий';
    return 'Средний';
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка AI прогноза...</div>;
  if (!groupId) return <div style={{ textAlign: 'center', padding: '40px' }}>👈 Выберите группу</div>;
  if (!prediction) return <div style={{ textAlign: 'center', padding: '40px' }}>Нет данных</div>;

  return (
    <div id="ai" className="tab-panel active">
      <div className="ai-section">
        <h3>🤖 AI-прогноз рисков</h3>
        <div className="ai-cards">
          <div className={`ai-card ${getRiskClass(prediction.disease_risk)}`}>
            <div className="ai-icon">{prediction.disease_risk === 'low' ? '🟢' : prediction.disease_risk === 'high' ? '🔴' : '🟡'}</div>
            <h4>Риск заболеваний:</h4>
            <p className="ai-value">{getRiskText(prediction.disease_risk)}</p>
            <p className="ai-desc">{prediction.disease_risk_description || 'Прогноз на основе текущих данных'}</p>
          </div>
          <div className={`ai-card ${getRiskClass(prediction.absence_risk)}`}>
            <div className="ai-icon">{prediction.absence_risk === 'low' ? '🟢' : prediction.absence_risk === 'high' ? '🔴' : '🟡'}</div>
            <h4>Риск отсутствия:</h4>
            <p className="ai-value">{getRiskText(prediction.absence_risk)}</p>
            <p className="ai-desc">{prediction.absence_risk_description || 'Прогноз посещаемости'}</p>
          </div>
          <div className={`ai-card ${getRiskClass(prediction.transition_risk)}`}>
            <div className="ai-icon">{prediction.transition_risk === 'low' ? '🟢' : prediction.transition_risk === 'high' ? '🔴' : '🟡'}</div>
            <h4>Риск переходов:</h4>
            <p className="ai-value">{getRiskText(prediction.transition_risk)}</p>
            <p className="ai-desc">{prediction.transition_risk_description || 'Адаптация детей'}</p>
          </div>
        </div>
        <div className="ai-info">
          <p><strong>Точность прогноза:</strong> {prediction.accuracy || 86}%</p>
          <p><strong>Основано на:</strong> исторических данных о посещаемости и заболеваемости</p>
        </div>
      </div>
    </div>
  );
};

export default AITab;

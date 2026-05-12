import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const AITab = ({ groups }) => {
  const [predictions, setPredictions] = useState({
    disease: { risk: 'medium', text: 'Загрузка...', desc: '' },
    absence: { risk: 'medium', text: 'Загрузка...', desc: '' },
    transition: { risk: 'medium', text: 'Загрузка...', desc: '' },
    accuracy: 0,
    groupsCount: 0
  });
  const [loading, setLoading] = useState(true);

  const loadPredictions = useCallback(async () => {
    if (groups.length === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      let totalDiseaseRisk = 0;
      let totalAbsenceRisk = 0;
      let totalTransitionRisk = 0;
      let totalAccuracy = 0;
      let validPredictions = 0;
      
      for (const group of groups) {
        try {
          const pred = await api.getAIPrediction(group.id);
          const riskToNumber = (risk) => {
            const r = (risk || 'medium').toLowerCase();
            if (r === 'low') return 1;
            if (r === 'high') return 3;
            return 2;
          };
          
          totalDiseaseRisk += riskToNumber(pred.disease_risk);
          totalAbsenceRisk += riskToNumber(pred.absence_risk);
          totalTransitionRisk += riskToNumber(pred.transition_risk);
          totalAccuracy += pred.accuracy || 86;
          validPredictions++;
        } catch (error) {
          console.error(`Ошибка AI для группы ${group.id}:`, error);
        }
      }
      
      if (validPredictions > 0) {
        const avgDisease = totalDiseaseRisk / validPredictions;
        const avgAbsence = totalAbsenceRisk / validPredictions;
        const avgTransition = totalTransitionRisk / validPredictions;
        const avgAccuracy = Math.round(totalAccuracy / validPredictions);
        
        const getRiskLevel = (value) => {
          if (value <= 1.5) return 'low';
          if (value >= 2.5) return 'high';
          return 'medium';
        };
        
        const getRiskText = (value) => {
          if (value <= 1.5) return 'Низкий';
          if (value >= 2.5) return 'Высокий';
          return 'Средний';
        };
        
        const getRiskDesc = (type, value) => {
          const level = getRiskLevel(value);
          const descMap = {
            disease: { low: 'Стабильная ситуация по всем группам', medium: 'Есть группы с повышенным риском', high: 'Критическая ситуация, требуется внимание' },
            absence: { low: 'Ожидаемая посещаемость в норме', medium: 'Прогнозируются пропуски в некоторых группах', high: 'Высокая вероятность массовых пропусков' },
            transition: { low: 'Адаптация детей проходит нормально', medium: 'Требуется наблюдение за переходными группами', high: 'Срочно требуется внимание к адаптации' }
          };
          return descMap[type][level];
        };
        
        setPredictions({
          disease: { risk: getRiskLevel(avgDisease), text: getRiskText(avgDisease), desc: getRiskDesc('disease', avgDisease) },
          absence: { risk: getRiskLevel(avgAbsence), text: getRiskText(avgAbsence), desc: getRiskDesc('absence', avgAbsence) },
          transition: { risk: getRiskLevel(avgTransition), text: getRiskText(avgTransition), desc: getRiskDesc('transition', avgTransition) },
          accuracy: avgAccuracy,
          groupsCount: validPredictions
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки AI:', error);
      setPredictions({
        disease: { risk: 'medium', text: 'Ошибка', desc: 'Не удалось загрузить прогноз' },
        absence: { risk: 'medium', text: 'Ошибка', desc: 'Не удалось загрузить прогноз' },
        transition: { risk: 'medium', text: 'Ошибка', desc: 'Не удалось загрузить прогноз' },
        accuracy: 0,
        groupsCount: 0
      });
    } finally {
      setLoading(false);
    }
  }, [groups]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const getRiskIcon = (risk) => {
    if (risk === 'low') return '🟢';
    if (risk === 'high') return '🔴';
    return '🟡';
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>🤖 Загрузка AI прогнозов...</div>;
  if (groups.length === 0) return <div style={{ textAlign: 'center', padding: '40px' }}>👈 Нет групп для анализа</div>;

  return (
    <div id="ai" className="tab-panel active">
      <div className="ai-section">
        <h3>🤖 AI-прогноз рисков (по всем группам)</h3>
        <div className="ai-cards">
          <div className={`ai-card risk-${predictions.disease.risk}`}>
            <div className="ai-icon">{getRiskIcon(predictions.disease.risk)}</div>
            <h4>Риск заболеваний:</h4>
            <p className="ai-value">{predictions.disease.text}</p>
            <p className="ai-desc">{predictions.disease.desc}</p>
          </div>
          <div className={`ai-card risk-${predictions.absence.risk}`}>
            <div className="ai-icon">{getRiskIcon(predictions.absence.risk)}</div>
            <h4>Риск отсутствия:</h4>
            <p className="ai-value">{predictions.absence.text}</p>
            <p className="ai-desc">{predictions.absence.desc}</p>
          </div>
          <div className={`ai-card risk-${predictions.transition.risk}`}>
            <div className="ai-icon">{getRiskIcon(predictions.transition.risk)}</div>
            <h4>Риск переходов:</h4>
            <p className="ai-value">{predictions.transition.text}</p>
            <p className="ai-desc">{predictions.transition.desc}</p>
          </div>
        </div>
        <div className="ai-info">
          <p><strong>Точность прогноза:</strong> {predictions.accuracy}% (на основе {predictions.groupsCount} групп)</p>
          <p><strong>Основано на:</strong> исторических данных о посещаемости, заболеваемости и сезонных факторах</p>
        </div>
      </div>
    </div>
  );
};

export default AITab;

-- Criar policy que bloqueia inserção de respostas em assessments concluídos
CREATE POLICY "prevent_responses_for_completed_assessments"
ON responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments 
    WHERE assessments.id = responses.assessment_id 
    AND assessments.status != 'completed'
  )
);
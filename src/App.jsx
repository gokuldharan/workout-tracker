import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Exercises from './pages/Exercises'
import ExerciseDetail from './pages/ExerciseDetail'
import LogWorkout from './pages/LogWorkout'
import Stats from './pages/Stats'
import WorkoutSession from './pages/WorkoutSession'
import TemplateEditor from './pages/TemplateEditor'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
        <Route path="/log" element={<LogWorkout />} />
        <Route path="/workout" element={<WorkoutSession />} />
        <Route path="/workout/:dayId" element={<WorkoutSession />} />
        <Route path="/templates/:dayId" element={<TemplateEditor />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
      <Nav />
    </>
  )
}

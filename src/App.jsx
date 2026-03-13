import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Exercises from './pages/Exercises'
import ExerciseDetail from './pages/ExerciseDetail'
import LogWorkout from './pages/LogWorkout'
import Stats from './pages/Stats'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/exercises/:id" element={<ExerciseDetail />} />
        <Route path="/log" element={<LogWorkout />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
      <Nav />
    </>
  )
}

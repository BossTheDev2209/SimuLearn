// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

export default function PhysicsBoard({ activeSim, isInteracting }) {
  const shouldHideLogo = isInteracting || activeSim !== null;

  return (
    <div className="flex-1 flex flex-col h-full w-full relative">
      {/* Landing Logo */}
      <AnimatePresence>
        {!shouldHideLogo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <h1 className="text-[80px] font-bold tracking-wide drop-shadow-sm">
              <span className="text-[#FFB65A]">Simu</span>
              <span className="text-[#C59355]">Learn</span>
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Simulation View */}
      {activeSim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col h-full w-full"
        >
          {/* Prompt Title Header */}
          <div className="px-8 pt-6 pb-4">
            <h2 className="text-[22px] font-bold text-gray-900">
              หัวข้อแบบจำลอง: {activeSim.title}
            </h2>
          </div>

          {/* Grid Canvas Area */}
          <div className="flex-1 mx-6 mb-6 rounded-2xl overflow-hidden border border-[#D5CBBD] bg-white relative shadow-sm">
            {/* Grid Background (Desmos-like) */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E8E0D5" strokeWidth="0.5" />
                </pattern>
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#smallGrid)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#D5CBBD" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* X axis */}
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#A69C8E" strokeWidth="1.5" />
              {/* Y axis */}
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#A69C8E" strokeWidth="1.5" />
            </svg>

            {/* Future Matter.js canvas will be layered here */}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-400 text-[14px] font-medium bg-white/80 px-4 py-2 rounded-lg">
                Matter.js canvas RAH
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
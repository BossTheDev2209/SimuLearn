import React, { forwardRef, useImperativeHandle, memo } from 'react';
import { useControlPanelState } from './useControlPanelState';
import { ObjectItem, GlobalSettings } from './ControlPanelUI';

const ControlPanel = forwardRef(function ControlPanel({ 
  simulationType = 'default', onUpdate, initialState, isLocked, onBeforeObjectUpdate,
  vectorEditor, setVectorEditor 
}, ref) {
  // 🌟 ดึงข้อมูลและฟังก์ชันทั้งหมดมาจาก Custom Hook
  const { state, setters, actions, refs, imperativeMethods } = useControlPanelState(initialState, simulationType, onUpdate, onBeforeObjectUpdate);

  // 🌟 ผูกฟังก์ชันเข้ากับ Ref เพื่อให้ Workspace เรียกใช้ได้แบบไม่พัง
  useImperativeHandle(ref, () => imperativeMethods);

  return (
    <div className="control-panel w-full h-full flex flex-col bg-theme-panel overflow-hidden relative rounded-2xl isolate">
      {isLocked && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[#FFB65A]/10 border-b border-[#FFB65A]/20 py-1.5 flex justify-center items-center gap-2 pointer-events-none rounded-t-2xl">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFB65A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
           <span className="text-xs font-bold text-[#FFB65A]">หยุดเล่นก่อนแก้ไขค่า</span>
        </div>
      )}

      <div className={`w-full shrink-0 px-4 py-3 bg-theme-sidebar border-b border-theme-border rounded-t-2xl ${isLocked ? 'pt-8' : ''}`}>
        <h3 className="text-[15px] font-bold text-theme-primary text-center tracking-wide">
          แผงการควบคุม
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-6 flex flex-col rounded-b-2xl bg-theme-panel">
        {state.objects.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center px-4 uppercase tracking-[0.1em]">
            <p className="text-[12px] font-bold text-theme-muted opacity-40">ยังไม่มีวัตถุ</p>
          </div>
        ) : (
          <div className="flex-1">
            {state.objects.map((obj, idx) => (
              <React.Fragment key={obj.id}>
                <ObjectItem
                  obj={obj} idx={idx} isLocked={isLocked} presetProps={state.presetProps} activePickerId={state.activePickerId}
                  setActivePickerId={setters.setActivePickerId} anchorRefs={refs.anchorRefs} actions={actions}
                  vectorEditor={vectorEditor} setVectorEditor={setVectorEditor}
                />
                {idx < state.objects.length - 1 && <div className="border-b border-theme-border mt-3 mb-4" />}
              </React.Fragment>
            ))}
          </div>
        )}
        <GlobalSettings isLocked={isLocked} state={state} setters={setters} />
      </div>
    </div>
  );
});

export default memo(ControlPanel);
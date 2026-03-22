import { useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getSimulationTemplate } from "../../simulations/SimulationRegistry.js";

export function useSimulationHistoryFetch({
  myUserId,
  setSimulations,
  setIsHistoryLoading,
  isInitialLoad
}) {
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (!myUserId) return;
      
      setIsHistoryLoading(true);
      console.log(`%c🔄 fetchData TRIGGERED at: ${new Date().getTime()}`, "color: #3b82f6; font-weight: bold;");
      
      if (!myUserId.startsWith("guest_")) {
        try {
          console.log("📡 Fetching history directly from Firestore...");
          const q = query(
            collection(db, "simulations"), 
            where("userId", "==", myUserId),
            orderBy("createdAt", "desc")
          );
          
          const querySnapshot = await getDocs(q);
          const apiHistory = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          if (!Array.isArray(apiHistory)) {
            console.warn("❌ Firestore returned non-array:", apiHistory);
            return;
          }

          console.log(`📊 Data received. Raw Length: ${apiHistory.length}`);

          // 🛡️ Advanced Deduplication: ID + Content-based check
          const seenIds = new Set();
          const seenContents = new Set(); 
          
          const formattedSimulations = apiHistory
            .map((item) => {
              const id = (item?.id || item?._id || "").toString();
              if (!id || seenIds.has(id)) return null;

              const getJsDate = (val) => {
                if (!val) return new Date();
                if (val.toDate) return val.toDate(); 
                if (val._seconds) return new Date(val._seconds * 1000);
                return new Date(val);
              };
              const date = getJsDate(item.createdAt);
              const timestampGroup = Math.floor(date.getTime() / 5000);
              const contentKey = `${item.title}-${timestampGroup}`;
              
              if (seenContents.has(contentKey)) {
                console.warn(`🛡️ Defensive Filter: Ignored redundant entry: "${item.title}" (ID: ${id})`);
                return null;
              }

              seenIds.add(id);
              seenContents.add(contentKey);

              const simType = item?.type || item?.topic_type || 'free_fall';
              let parsedData = null;
              try {
                if (item?.data?.objects) {
                  parsedData = item.data; 
                } else {
                  const template = getSimulationTemplate(simType);
                  const rawVariables = item?.calculated_variables || item?.data?.variables || {};
                  parsedData = {
                    simulationType: simType,
                    ...(template?.parseData(rawVariables) ?? {})
                  };
                }
              } catch (parseErr) {
                return null;
              }

              return {
                id,
                title: item?.title || "แบบจำลองของฉัน",
                userId: item?.userId,
                createdAt: date,
                data: parsedData,
                physicsState: item?.physicsState || null,
                controlState: item?.controlState || null
              };
            })
            .filter(Boolean);

          formattedSimulations.sort((a, b) => b.createdAt - a.createdAt);
          
          console.log(`✅ setSimulations CALLED with ${formattedSimulations.length} unique items`);
          
          setSimulations(formattedSimulations);
          isInitialLoad.current = false;
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log("⏹️ Fetch aborted by cleanup");
            return;
          }
          console.error("❌ History fetch error:", err);
        } finally {
          if (!controller.signal.aborted) {
            setIsHistoryLoading(false);
          }
        }
      } else {
        setIsHistoryLoading(false);
      }
    };

    fetchData();
    return () => {
      console.log("🧹 Cleaning up fetchData effect...");
      controller.abort();
    };
  }, [myUserId, setSimulations, setIsHistoryLoading, isInitialLoad]);
}

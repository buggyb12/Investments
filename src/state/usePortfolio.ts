import { useEffect, useMemo, useReducer, useRef } from "react";
import {
  PROFILES,
  adjustAllocation,
  pickProfileByYears,
  portfolioMetrics,
  type Allocation,
  type FundId,
  type ProfileId,
} from "../lib/portfolio";

interface PortfolioState {
  /** null = following recommended profile (auto-recompute on years change) */
  selectedProfile: ProfileId | null;
  allocation: Allocation;
  manuallyOverridden: boolean;
}

type Action =
  | { type: "selectProfile"; profile: ProfileId }
  | { type: "adjust"; fundId: FundId; value: number }
  | { type: "resetToProfile"; profile: ProfileId };

function reducer(state: PortfolioState, action: Action): PortfolioState {
  switch (action.type) {
    case "selectProfile":
      return {
        selectedProfile: action.profile,
        allocation: { ...PROFILES[action.profile].allocation },
        manuallyOverridden: false,
      };
    case "adjust":
      return {
        ...state,
        allocation: adjustAllocation(state.allocation, action.fundId, action.value),
        manuallyOverridden: true,
      };
    case "resetToProfile":
      return {
        selectedProfile: action.profile,
        allocation: { ...PROFILES[action.profile].allocation },
        manuallyOverridden: false,
      };
  }
}

export function usePortfolio(yearsToRetirement: number) {
  const recommendedProfile = pickProfileByYears(yearsToRetirement);

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    selectedProfile: recommendedProfile,
    allocation: { ...PROFILES[recommendedProfile].allocation },
    manuallyOverridden: false,
  }));

  // When years-to-retirement changes the recommended profile, follow it
  // unless the user explicitly overrode the allocation.
  const prevRecommended = useRef(recommendedProfile);
  useEffect(() => {
    if (prevRecommended.current === recommendedProfile) return;
    prevRecommended.current = recommendedProfile;
    if (!state.manuallyOverridden) {
      dispatch({ type: "resetToProfile", profile: recommendedProfile });
    }
  }, [recommendedProfile, state.manuallyOverridden]);

  const metrics = useMemo(
    () => portfolioMetrics(state.allocation),
    [state.allocation],
  );

  return {
    allocation: state.allocation,
    selectedProfile: state.selectedProfile,
    recommendedProfile,
    manuallyOverridden: state.manuallyOverridden,
    metrics,
    selectProfile: (profile: ProfileId) =>
      dispatch({ type: "selectProfile", profile }),
    adjust: (fundId: FundId, value: number) =>
      dispatch({ type: "adjust", fundId, value }),
    reset: () =>
      dispatch({ type: "resetToProfile", profile: recommendedProfile }),
  };
}

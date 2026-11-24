export const getLocalStoredUserId = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const userId = localStorage.getItem("userId");
      return userId ?? "5afb0c71-5e85-46f6-8780-3059cbb7bbf9"; // Do-do : remove the fall back of userId and handle empty case in components
    } catch (error) {
      console.error("Error retrieving user data from local storage:", error);
      return null;
    }
  } else {
    // Running in SSR, return null
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};

export const getLocalStoredChannelId = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const channelId = localStorage.getItem("channelId");
      return channelId ?? ""; // Do-do : remove the fall back of userId and handle empty case in components
    } catch (error) {
      console.error("Error retrieving user data from local storage:", error);
      return null;
    }
  } else {
    // Running in SSR, return null
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};

export const getLocalStoredCollectionFramework = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const collectionFramework = localStorage.getItem("collectionFramework");
      return collectionFramework ?? ""; // Do-do : remove the fall back of userId and handle empty case in components
    } catch (error) {
      console.error("Error retrieving user data from local storage:", error);
      return null;
    }
  } else {
    // Running in SSR, return null
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};

export const getLocalStoredUserName = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");

      if (userData?.firstName) {
        const lastName = userData.lastName || "";
        return `${userData.firstName} ${lastName}`.trim();
      }

      if (userData?.name) {
        return userData.name;
      }

      return "Anonymous User";
    } catch (error) {
      console.error("Error retrieving user name from local storage:", error);
      return "Anonymous User";
    }
  } else {
    // Running in SSR, return null
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};
export const getLocalStoredToken = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const token = localStorage.getItem("token") || "";

     
console.log("token", token)
      if (token) {
        return token;
       }

    } catch (error) {
      console.error("Error retrieving user name from local storage:", error);
      return "Anonymous User";
    }
  } else {
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};
export const getLocalStoredUserRole = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const userInfo = JSON.parse(localStorage.getItem("adminInfo") || "{}");
      return userInfo?.role;
    } catch (error) {
      console.error("Error retrieving user name from local storage:", error);
      return "Anonymous User";
    }
  } else {
    // Running in SSR, return null
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};


export const getLocalStoredUserSpecificBoard = () => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const userSpecificBoard = localStorage.getItem("userSpecificBoard") || [];
      return  {
        code: "board",
        value: userSpecificBoard
      };
    } catch (error) {
      console.error("Error retrieving userSpecificBoard from local storage:", error);
      return null;
    }
  } else {
    // Running in SSR, return null
    console.warn("Local storage is not available (SSR)");
    return null;
  }
};

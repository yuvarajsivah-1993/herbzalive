import React, { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser, IAgoraRTCDevice } from 'agora-rtc-sdk-ng';
import { faMicrophone, faMicrophoneSlash, faVideo, faVideoSlash, faPhoneSlash, faUserCircle, faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const AgoraVideoPlayer = ({ videoTrack }: { videoTrack: ICameraVideoTrack | undefined }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && videoTrack) {
      videoTrack.play(ref.current);
    }
    return () => {
      videoTrack?.stop();
    };
  }, [videoTrack]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }}></div>;
};

interface VideoCallProps {
  appId: string;
  channelName: string;
  token: string;
  onCallEnd: () => void;
  userName?: string;
  doctorName: string;
  patientName: string;
  localUserUid: number;
  callStartTime: Timestamp;
}

export const VideoCall: React.FC<VideoCallProps> = ({ appId, channelName, token, onCallEnd, userName, doctorName, patientName, localUserUid, callStartTime }) => {
  const client = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<[IMicrophoneAudioTrack, ICameraVideoTrack] | []>([]);

  const [users, setUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [audioDevices, setAudioDevices] = useState<IAgoraRTCDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<IAgoraRTCDevice[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(h.toString());
    parts.push(m.toString().padStart(2, '0'));
    parts.push(s.toString().padStart(2, '0'));
    return parts.join(':');
  };

  // Agora SDK Initialization and Join Logic
  useEffect(() => {
    let isMounted = true;
    client.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    const initAndJoin = async () => {
      client.current?.on("user-published", async (user, mediaType) => {
        await client.current?.subscribe(user, mediaType);
        if (isMounted) {
          if (mediaType === "video") {
            setUsers(prevUsers => [...prevUsers, user]);
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        }
      });

      client.current?.on("user-unpublished", (user, type) => {
        if (isMounted) {
          if (type === "audio") {
            user.audioTrack?.stop();
          }
          if (type === "video") {
            setUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
          }
        }
      });

      client.current?.on("user-left", user => {
        if (isMounted) {
          setUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
        }
      });

      try {
        await client.current?.join(appId, channelName, token, localUserUid);
        if (!isMounted) return;

        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (!isMounted) {
            tracks.forEach(track => track.close());
            return;
        }
        localTracksRef.current = tracks;
        setMicOn(tracks[0].enabled);
        setCameraOn(tracks[1].enabled);
        await client.current?.publish(tracks);
      } catch (error) {
        console.error("Agora connection error:", error);
      }
    };

    const fetchDevices = async () => {
        const devices = await AgoraRTC.getDevices();
        const audio = devices.filter(d => d.kind === 'audioinput');
        const video = devices.filter(d => d.kind === 'videoinput');
        setAudioDevices(audio);
        setVideoDevices(video);
        if (audio.length > 0) setSelectedAudioDeviceId(audio[0].deviceId);
        if (video.length > 0) setSelectedVideoDeviceId(video[0].deviceId);
    };

    initAndJoin();
    fetchDevices();

    return () => {
      isMounted = false;
      for (const track of localTracksRef.current) {
        track.stop();
        track.close();
      }
      client.current?.leave();
    };
  }, [appId, channelName, token, localUserUid]);

  // Call Timer Effect
  useEffect(() => {
    if (callStartTime) {
      const startTime = callStartTime.toDate().getTime();
      const timer = setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(duration);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCallDuration(0);
    }
  }, [callStartTime]);

  const leaveChannel = () => {
    onCallEnd();
  };

  const toggleMic = async () => {
    if (localTracksRef.current[0]) {
      await localTracksRef.current[0].setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCamera = async () => {
    if (localTracksRef.current[1]) {
      await localTracksRef.current[1].setEnabled(!cameraOn);
      setCameraOn(!cameraOn);
    }
  };

  const handleAudioDeviceChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedAudioDeviceId(deviceId);
    if (localTracksRef.current[0]) {
      await localTracksRef.current[0].setDevice(deviceId);
    }
  }, []);

  const handleVideoDeviceChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setSelectedVideoDeviceId(deviceId);
    if (localTracksRef.current[1]) {
      await localTracksRef.current[1].setDevice(deviceId);
    }
  }, []);

  const getDisplayName = (uid: number | string) => {
    if (uid === localUserUid) {
      return userName || 'You';
    } else if (uid === 1) { // Doctor's UID
      return doctorName;
    } else if (uid === 2) { // Patient's UID
      return patientName;
    }
    return 'Unknown User';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
      <div className={`flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100%-80px)]`}>
        {/* Local User */}
        <div className="w-full h-full rounded-lg overflow-hidden relative bg-gray-900 flex items-center justify-center">
          {cameraOn && localTracksRef.current[1] ? (
            <AgoraVideoPlayer videoTrack={localTracksRef.current[1]} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <FontAwesomeIcon icon={faUserCircle} className="text-slate-600 text-6xl" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-slate-800 bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {getDisplayName(localUserUid)}
          </div>
          {!micOn && (
              <div className="absolute bottom-2 right-2 bg-slate-800 bg-opacity-75 rounded-full p-2">
                <FontAwesomeIcon icon={faMicrophoneSlash} className="text-white text-sm" />
              </div>
          )}
        </div>
        {/* Remote Users */}
        {users.map(user => (
          <div key={user.uid} className="w-full h-full rounded-lg overflow-hidden relative bg-gray-900 flex items-center justify-center">
            {user.hasVideo ? (
                <AgoraVideoPlayer videoTrack={user.videoTrack} />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <FontAwesomeIcon icon={faUserCircle} className="text-slate-600 text-6xl" />
                </div>
            )}
            {!user.hasAudio && (
              <div className="absolute bottom-2 right-2 bg-slate-800 bg-opacity-75 rounded-full p-2">
                <FontAwesomeIcon icon={faMicrophoneSlash} className="text-white text-sm" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-slate-800 bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              {getDisplayName(user.uid)}
            </div>
          </div>
        ))}
      </div>
      {/* Controls */}
      <div className="h-20 bg-gray-900 flex justify-between items-center px-6">
        <div className="text-white text-lg font-semibold">
            {formatDuration(callDuration)}
        </div>
        <div className="flex items-center space-x-6">
            <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}>
            <FontAwesomeIcon icon={micOn ? faMicrophone : faMicrophoneSlash} className="text-white text-xl" />
            </button>
            <button onClick={leaveChannel} className="w-16 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-transform transform hover:scale-105">
            <FontAwesomeIcon icon={faPhoneSlash} className="text-white text-xl" />
            </button>
            <button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${cameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}>
            <FontAwesomeIcon icon={cameraOn ? faVideo : faVideoSlash} className="text-white text-xl" />
            </button>
        </div>
        <div className="flex items-center space-x-4">
            <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center">
                <FontAwesomeIcon icon={faCog} className="text-white text-xl" />
            </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Settings</h2>
            <div className="mb-4">
              <label htmlFor="audio-device" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Microphone</label>
              <select
                id="audio-device"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={selectedAudioDeviceId || ''}
                onChange={handleAudioDeviceChange}
              >
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="video-device" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Camera</label>
              <select
                id="video-device"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={selectedVideoDeviceId || ''}
                onChange={handleVideoDeviceChange}
              >
                {videoDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;

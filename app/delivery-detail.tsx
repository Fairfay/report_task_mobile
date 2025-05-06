import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { Appbar, Button, Text, Chip, Portal, Modal, HelperText, List, TextInput, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { api, FileResponse, CreateDeliveryData } from '@/services/api';
import { useAuth } from '../hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getValidChipColors } from '@/lib/colors';

interface Transport {
  id: number;
  brand: string;
}

interface Service {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
  color: string;
}

interface Packaging {
  id: number;
  name: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface DeliveryDetails {
  id: number;
  transport: number | null;
  number: string;
  departure_time: string | null;
  delivery_time: string | null;
  distance: string;
  services: number[];
  status: number | null;
  technical_state: boolean;
  fio: string;
  comment: string;
  media?: any;
  packaging: number | null;
  file?: number[];
}

const techStates = [
  { label: 'Исправно', value: true, color: '#176c3a' },
  { label: 'Неисправно', value: false, color: '#a31313' },
];

export default function DeliveryDetailScreen() {
  // Хуки для навигации и данных
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { logout } = useAuth();
// Состояние
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [brand, setBrand] = useState<Transport | null>(null);
  const [number, setNumber] = useState('');
  const [distance, setDistance] = useState('');
  const [media, setMedia] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [techState, setTechState] = useState<boolean | null>(null);
  const [fio, setFio] = useState('');
  const [comment, setComment] = useState('');
  const [packaging, setPackaging] = useState<Packaging | null>(null);

  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState<Date | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(null);
  const [showDepartureDatePicker, setShowDepartureDatePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [showDeliveryTimePicker, setShowDeliveryTimePicker] = useState(false);

  const [transports, setTransports] = useState<Transport[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [isRefDataLoading, setIsRefDataLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileResponse[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileDetails, setFileDetails] = useState<FileResponse[]>([]);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null); // State to track deleting file

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    'brand' | 'time' | 'distance' | 'service' | 'status' | 'techState' | 'fio' | 'comment' | 'packaging' | null
  >(null);
// Парсинг даты
  const parseDate = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string received:", dateString);
        return null;
      }
      return date;
    } catch (e) {
      console.error("Error parsing date string:", dateString, e);
      return null;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    try { return date.toLocaleDateString('ru-RU'); } catch (e) { console.error(e); return ''; }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    try { return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { console.error(e); return ''; }
  };

  const formatDateTimeForDisplay = (dateStr: string | null) => {
    const date = parseDate(dateStr);
    if (!date) return '---';
    return `${formatDate(date)} ${formatTime(date)}`;
  };
// Форматирование даты для API
  const formatDateTimeForAPI = (date: Date | null, time: Date | null): string | undefined => {
    if (!date || !time) return undefined;
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined.toISOString();
  };
// Инициализация состояния формы
  const initializeFormState = useCallback((data: DeliveryDetails | null) => {
    if (!data) return;

    const initialBrand = transports.find(t => t.id === data.transport);
    const initialStatus = statuses.find(s => s.id === data.status);
    const initialPackaging = packagings.find(p => p.id === data.packaging);
    const initialServices = services.filter(s => data.services?.includes(s.id));

    console.log("Initializing form with:", { initialBrand, initialStatus, initialPackaging, initialServices });

    setBrand(initialBrand || null); 
    setNumber(data.number || '');
    setDistance(data.distance || '');
    setSelectedServices(initialServices);
    setStatus(initialStatus || null); 
    setTechState(data.technical_state ?? null);
    setFio(data.fio || '');
    setComment(data.comment || '');
    setPackaging(initialPackaging || null); 

    const depDate = parseDate(data.departure_time);
    const delDate = parseDate(data.delivery_time);
    setDepartureDate(depDate);
    setDepartureTime(depDate);
    setDeliveryDate(delDate);
    setDeliveryTime(delDate);


  }, [transports, services, statuses, packagings]);
// Загрузка данных доставки
  useEffect(() => {
    const fetchDeliveryDetails = async () => {
      if (!id) {
        setError('ID доставки не найден.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const deliveryId = parseInt(id, 10);
        if (isNaN(deliveryId)) throw new Error("Неверный ID доставки");
        
        const [deliveryData, statusesData, transportsData, servicesData, packagingsData] = await Promise.all([
            api.getDeliveryById(deliveryId, logout),
            api.getStatuses(logout),
            api.getTransports(logout),
            api.getServices(logout),
            api.getPackagings(logout)
        ]);

        console.log("Received delivery data from API:", deliveryData);
        setDelivery(deliveryData);
        setStatuses(statusesData?.results || statusesData || []);
        setTransports(transportsData?.results || transportsData || []);
        setServices(servicesData?.results || servicesData || []);
        setPackagings(packagingsData?.results || packagingsData || []);

        if (deliveryData.file && deliveryData.file.length > 0) {
            try {
                console.log("Fetching details for file IDs:", deliveryData.file);
                const filePromises = deliveryData.file.map((fileId: number) => 
                    api.getFileById(fileId, logout)
                );
                const fetchedFiles = await Promise.all(filePromises);
                setFileDetails(fetchedFiles);
                console.log("Fetched file details:", fetchedFiles);
            } catch (fileError) {
                 console.error("Error fetching file details:", fileError);
                 setError(err => err ? `${err}; Ошибка загрузки файлов` : 'Ошибка загрузки файлов');
            }
        }

        initializeFormState(deliveryData);

      } catch (err) {
        console.error('Error fetching delivery details:', err);
        setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeliveryDetails();
  }, [id, logout]);
// Загрузка справочников
  useEffect(() => {
    const fetchRefData = async () => {
      setIsRefDataLoading(true);
      try {
        const [transportsData, servicesData, statusesData, packagingsData] = await Promise.all([
          api.getTransports(logout),
          api.getServices(logout),
          api.getStatuses(logout),
          api.getPackagings(logout)
        ]);
        setTransports(transportsData?.results || transportsData || []);
        setServices(servicesData?.results || servicesData || []);
        setStatuses(statusesData?.results || statusesData || []);
        setPackagings(packagingsData?.results || packagingsData || []);
      } catch (err) {
        console.error("Error fetching reference data:", err);
        setError("Ошибка загрузки справочников для редактирования");
      } finally {
        setIsRefDataLoading(false);
      }
    };

    if (isEditing && transports.length === 0) {
      fetchRefData();
    }
  }, [isEditing, logout, transports.length]);

  const handleDelete = () => {
    if (!delivery) return;
    // Подтверждение удаления
    Alert.alert(
      "Подтверждение удаления",
      `Вы уверены, что хотите удалить доставку №${delivery.id}?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            setError(null);
            try {
              await api.deleteDelivery(delivery.id, logout);
              router.back();
            } catch (err) {
              console.error('Error deleting delivery:', err);
              setError(err instanceof Error ? err.message : 'Ошибка удаления доставки');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };
// Обновление доставки
  const handleUpdate = async () => {
    if (!delivery) return;
    setIsSaving(true);
    setError(null);

    const payload: CreateDeliveryData = {
      transport: brand?.id,
      number: number?.trim(),
      departure_time: formatDateTimeForAPI(departureDate, departureTime),
      delivery_time: formatDateTimeForAPI(deliveryDate, deliveryTime),
      distance: distance?.trim(),
      services: selectedServices.map(s => s.id),
      status: status?.id ?? undefined,
      technical_state: techState ?? false,
      fio: fio ? fio.trim() : undefined,
      comment: comment ? comment.trim() : undefined,
      packaging: packaging?.id ?? undefined,
      file: uploadedFiles.map(f => f.id)
    };

    try {
      const updatedDelivery = await api.updateDelivery(delivery.id, payload, logout);
      setDelivery(updatedDelivery);
      initializeFormState(updatedDelivery);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating delivery:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (delivery) {
      initializeFormState(delivery);
    }
    clearMedia();
    setIsEditing(false);
    setError(null);
  };

  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
    setError(null);
    if (!isEditing && delivery) {
      initializeFormState(delivery);
    }
  };

  const openModal = (type: string) => {
    setModalType(type as any);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
  };
//Выбор медиа
  const pickMedia = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'], 
            copyToCacheDirectory: false 
        });
        if (result.canceled) { return; }

        if (result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            const maxSize = 10 * 1024 * 1024; 
            if (asset.size && asset.size > maxSize) {
                Alert.alert("Ошибка", "Файл слишком большой (макс. 10МБ)");
                return;
            }
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' } as any);
            
            setIsUploading(true);
            setError(null);
            try {
                const response = await api.uploadFile(formData, logout);
                setUploadedFiles(response);
            } catch (uploadError) {
                console.error("Upload failed:", uploadError);
                setError(uploadError instanceof Error ? uploadError.message : 'Ошибка загрузки файла');
                setUploadedFiles([]);
            } finally {
                setIsUploading(false);
            }
        }
    } catch (error) {
        console.error("Error picking/uploading media:", error);
        setError("Не удалось выбрать или загрузить файл.");
        setIsUploading(false);
    }
  };

  const clearMedia = () => {
      setUploadedFiles([]);
  };
// Модальное окно для выбора времени
  const renderTimeModalContent = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Отправка и доставка</Text>
      <Text style={styles.modalLabel}>ОТПРАВКА</Text>
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDepartureDatePicker(true)}><Text style={styles.dateTimeButtonText}>{departureDate ? formatDate(departureDate) : 'Выберите дату'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDepartureTimePicker(true)}><Text style={styles.dateTimeButtonText}>{departureTime ? formatTime(departureTime) : 'Выберите время'}</Text></TouchableOpacity>
      </View>
      <Text style={styles.modalLabel}>ДОСТАВКА</Text>
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDeliveryDatePicker(true)}><Text style={styles.dateTimeButtonText}>{deliveryDate ? formatDate(deliveryDate) : 'Выберите дату'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.dateTimeButton} onPress={() => setShowDeliveryTimePicker(true)}><Text style={styles.dateTimeButtonText}>{deliveryTime ? formatTime(deliveryTime) : 'Выберите время'}</Text></TouchableOpacity>
      </View>
      <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
      {showDepartureDatePicker && <DateTimePicker value={departureDate || new Date()} mode="date" display="calendar" onChange={(e, d) => { setShowDepartureDatePicker(false); if (d) setDepartureDate(d); }} />}
      {showDepartureTimePicker && <DateTimePicker value={departureTime || new Date()} mode="time" display="spinner" is24Hour={true} onChange={(e, t) => { setShowDepartureTimePicker(false); if (t) setDepartureTime(t); }} />}
      {showDeliveryDatePicker && <DateTimePicker value={deliveryDate || new Date()} mode="date" display="calendar" onChange={(e, d) => { setShowDeliveryDatePicker(false); if (d) setDeliveryDate(d); }} />}
      {showDeliveryTimePicker && <DateTimePicker value={deliveryTime || new Date()} mode="time" display="spinner" is24Hour={true} onChange={(e, t) => { setShowDeliveryTimePicker(false); if (t) setDeliveryTime(t); }} />}
    </View>
  );
// Модальное окно для выбора типа
  const renderModalContent = () => {
    if (isRefDataLoading) {
      return <View style={styles.modalContent}><ActivityIndicator /><Text style={{color: '#fff', textAlign: 'center', marginTop: 10}}>Загрузка...</Text></View>;
    }
    switch (modalType) {
      case 'brand': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Модель и номер</Text>
          <Text style={styles.modalLabel}>Модель</Text>
          <View style={styles.chipContainer}>
            {transports.map(t => <Chip key={t.id} selected={brand?.id === t.id} onPress={() => setBrand(t)} style={styles.chipItem} textStyle={styles.chipText}>{t.brand}</Chip>)}
          </View>
          <TextInput label="Номер" value={number} onChangeText={setNumber} style={styles.modalInput} />
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'fio': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ФИО сборщика</Text>
          <TextInput label="ФИО сборщика" value={fio} onChangeText={setFio} style={styles.modalInput} autoCapitalize="words" />
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'comment': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Комментарий</Text>
          <TextInput label="Комментарий" value={comment} onChangeText={setComment} style={styles.modalInput} multiline numberOfLines={3} autoCapitalize="sentences" />
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'time': return renderTimeModalContent();
      case 'distance': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Маршрут</Text>
          <TextInput
            label="Дистанция"
            value={distance}
            onChangeText={setDistance}
            style={styles.modalInput}
            keyboardType="numeric"
          />
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'service': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Услуга</Text>
          <View style={styles.chipContainer}>
            {services.map(s => <Chip key={s.id} selected={selectedServices.some(sel => sel.id === s.id)} onPress={() => setSelectedServices(prev => prev.some(sel => sel.id === s.id) ? prev.filter(item => item.id !== s.id) : [...prev, s])} style={styles.chipItem} textStyle={styles.chipText}>{s.name}</Chip>)}
          </View>
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'techState': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Тех. исправность</Text>
          <View style={styles.chipContainerColumn}>
            {techStates.map(s => <Chip key={s.label} selected={techState === s.value} onPress={() => setTechState(s.value)} style={styles.chipItem} textStyle={styles.chipText}>{s.label}</Chip>)}
          </View>
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'packaging': return (
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Упаковка</Text>
          <View style={styles.chipContainer}>
            {packagings.map(p => <Chip key={p.id} selected={packaging?.id === p.id} onPress={() => setPackaging(p)} style={styles.chipItem} textStyle={styles.chipText}>{p.name}</Chip>)}
          </View>
          <Button mode="contained" onPress={closeModal} style={styles.modalBtn}>Применить</Button>
        </View>
      );
      case 'status':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Статус</Text>
            <View style={styles.chipContainerColumn || { gap: 8, marginBottom: 16 }}>
              {statuses.map(sItem => {
                const isSelected = status?.id === sItem.id;
                const defaultBg = styles.chipItem?.backgroundColor || '#232428'; 
                const defaultText = styles.chipText?.color || '#fff';
                const { backgroundColor: chipBg, textColor: chipText } = getValidChipColors(sItem.color, defaultBg, defaultText);
                
                return (
                  <Chip
                    key={sItem.id}
                    selected={isSelected}
                    onPress={() => setStatus(sItem)}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: chipBg,
                        borderColor: isSelected ? 'white' : 'transparent',
                        borderWidth: isSelected ? 1 : 0,
                        width: '100%',
                        justifyContent: 'center',
                      }
                    ]}
                    textStyle={[{ color: 'black', textAlign: 'center' }, styles.chipText, isSelected && { fontWeight: 'bold' } ]}
                  >
                    <Text style={{color: 'black'}}>{sItem.name}</Text>
                  </Chip>
                );
              })}
            </View>
            <Button 
              mode="contained" 
              onPress={closeModal}
              style={[styles.modalBtn, { backgroundColor: '#666' }]}
              textColor="#fff"
            >
              Применить
            </Button>
          </View>
        );
      default: return null;
    }
  };

// Инициализация формы
  useEffect(() => {
    if (delivery && statuses.length > 0 && transports.length > 0 && services.length > 0 && packagings.length > 0) {
      console.log("Dependencies met, calling initializeFormState");
      initializeFormState(delivery);
    }
  }, [delivery, statuses, transports, services, packagings, initializeFormState]);

// Загрузка справочников
  useEffect(() => {
    const fetchAndInitialize = async () => {
        if (!isEditing) return;

        setIsRefDataLoading(true);
        let refDataError = null;
        try {

            if (transports.length === 0 || services.length === 0 || statuses.length === 0 || packagings.length === 0) {
                console.log('Fetching reference data for editing...');
                const [transportsData, servicesData, statusesData, packagingsData] = await Promise.all([
                    api.getTransports(logout),
                    api.getServices(logout),
                    api.getStatuses(logout),
                    api.getPackagings(logout)
                ]);

                setTransports(transportsData?.results || transportsData || []);
                setServices(servicesData?.results || servicesData || []);
                setStatuses(statusesData?.results || statusesData || []);
                setPackagings(packagingsData?.results || packagingsData || []);
            } else {
                 initializeFormState(delivery);
            }
        } catch (err) {
            console.error("Error fetching reference data:", err);
            refDataError = "Ошибка загрузки справочников для редактирования";
            setError(refDataError);
        } finally {
            setIsRefDataLoading(false);
        }
    };

    fetchAndInitialize();

  }, [isEditing, logout]);

  // Обработчик удаления файла
  const handleDeleteFile = async (fileId: number) => {
    Alert.alert(
      "Подтверждение удаления",
      "Вы уверены, что хотите удалить этот файл? Это действие необратимо.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            setDeletingFileId(fileId);
            setError(null);
            try {
              await api.deleteFile(fileId, logout);
              setFileDetails(prev => prev.filter(f => f.id !== fileId));
              setDelivery(prev => {
                  if (!prev) return null;
                  return {
                      ...prev,
                      file: (prev.file?.filter(id => typeof id === 'number' && id !== fileId) || []) as number[]
                  };
              });
            } catch (err) {
              console.error('Error deleting file:', err);
              setError(err instanceof Error ? err.message : 'Ошибка удаления файла');
            } finally {
              setDeletingFileId(null);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <View style={[styles.container, styles.centerContent]}><ActivityIndicator size="large" color="#fff" /><Text style={styles.loadingText}>Загрузка данных...</Text></View>;
  }
  if (!isEditing && error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Appbar.Header style={styles.header}><Appbar.BackAction onPress={() => router.back()} /><Appbar.Content title="Ошибка" /></Appbar.Header>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.button}>Назад</Button>
      </View>
    );
  }
  if (!delivery) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Appbar.Header style={styles.header}><Appbar.BackAction onPress={() => router.back()} /><Appbar.Content title="Ошибка" /></Appbar.Header>
        <Text style={styles.errorText}>Доставка не найдена.</Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.button}>Назад</Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={styles.header}>
        {isEditing ? (
          <Appbar.Action icon="close" onPress={handleCancelEdit} disabled={isSaving} />
        ) : (
          <Appbar.BackAction onPress={() => router.back()} disabled={isDeleting} />
        )}
        <Appbar.Content title={isEditing ? "Редактирование" : `Доставка №${delivery.id}`} />
        {isEditing ? (
          <Button onPress={handleUpdate} disabled={isSaving || isRefDataLoading} loading={isSaving} textColor='#fff'>Сохранить</Button>
        ) : (
          <Appbar.Action icon="pencil" onPress={toggleEditMode} disabled={isDeleting} />
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {isEditing ? (
          <>
            <List.Section>
              <List.Subheader>Основная информация</List.Subheader>
              <List.Item title="Модель и номер" description={brand ? `${brand.brand} ${number}` : 'Не выбрано'} left={props => <MaterialIcons name="local-shipping" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('brand')} />
              <List.Item title="Отправка и доставка" description={departureDate && deliveryDate ? `${formatDate(departureDate)} ${formatTime(departureTime)} - ${formatDate(deliveryDate)} ${formatTime(deliveryTime)}` : 'Не выбрано'} left={props => <MaterialIcons name="schedule" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('time')} />
              <List.Item title="Адреса и координаты" description={distance ? `Дистанция: ${distance} км` : 'Не выбрано'} left={props => <MaterialIcons name="map" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('distance')} />
              <List.Item title="Услуга" description={selectedServices.length ? selectedServices.map(s => s.name).join(', ') : 'Не выбрано'} left={props => <MaterialIcons name="build" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('service')} />
              <List.Item 
                title="Статус" 
                description={!isEditing && status ? '' : (status?.name || 'Не выбрано')} // Hide text description if chip is shown via 'right'
                left={props => <MaterialIcons name="flag" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} 
                onPress={() => openModal('status')}
                right={props => {
                  if (!status) return <List.Icon {...props} icon="chevron-right" />;
                  const { backgroundColor: currentStatusBg, textColor: currentStatusText } = getValidChipColors(status.color, styles.chipItem?.backgroundColor || '#232428');
                  return (
                    <Chip
                      style={[
                        styles.chip, 
                        { backgroundColor: currentStatusBg, alignSelf: 'center', marginRight: 8 },
                        (!isEditing && status) ? {} : {marginRight: 8} 
                      ]}
                      textStyle={{ color: currentStatusText, fontSize: styles.chipText?.fontSize }}
                    >
                      {status.name}
                    </Chip>
                  );
                }}
              />
              <List.Item title="Упаковка" description={packaging?.name || 'Не выбрано'} left={props => <MaterialIcons name="inventory" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('packaging')} />
              <List.Item title="ФИО сборщика" description={fio || 'Не указано'} left={props => <MaterialIcons name="person" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('fio')} />
              <List.Item title="Комментарий" description={comment || 'Не указано'} left={props => <MaterialIcons name="comment" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} onPress={() => openModal('comment')} />
              <List.Item 
                title="Медиафайл"
                description={
                    uploadedFiles.length > 0 
                    ? uploadedFiles[0].file.split('/').pop()
                    : (fileDetails.length > 0 ? `Прикреплено: ${fileDetails.length}` : 'Нажмите для выбора')
                }
                descriptionNumberOfLines={1}
                left={props => <MaterialIcons name="attach-file" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
                onPress={pickMedia} 
                disabled={isUploading}
                right={props => 
                    isUploading ? (
                        <ActivityIndicator {...props} style={{ marginRight: 14 }} size="small" />
                    ) : uploadedFiles.length > 0 ? (
                        <IconButton {...props} icon="close-circle" size={20} onPress={clearMedia} style={{ marginRight: 8 }} />
                    ) : (
                         <List.Icon {...props} icon="chevron-right" />
                    )
                }
              />
              <List.Item
                title="Тех. исправность"
                description={techState === null ? 'Не выбрано' : (techState ? 'Исправно' : 'Неисправно')}
                left={props => <MaterialIcons name="settings" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />} 
                onPress={() => openModal('techState')}
                right={props => (
                    <Chip 
                      style={[styles.chip, { backgroundColor: techState ? techStates[0].color : techStates[1].color, marginRight: 0 }]} 
                      textStyle={styles.chipText}
                    >
                      {techState === null ? '-' : (techState ? 'Исправно' : 'Неисправно')}
                    </Chip>
                )}
              />
            </List.Section>
            {isUploading && <ActivityIndicator style={{marginTop: 10}}/>}
            {error && (
              <HelperText type="error" visible={!!error} style={styles.errorTextHelper}>
                {error}
              </HelperText>
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Основная информация</Text>
              <View style={styles.detailRow}>
                <MaterialIcons name="local-shipping" size={20} color="#bbb" style={styles.icon} />
                <Text style={styles.detailLabel}>Модель и номер:</Text>
                <Text style={styles.detailValue}>
                    {`${transports.find(t => t.id === delivery.transport)?.brand || 'Неизв. транспорт'} ${delivery.number || ''}`.trim()}
                </Text>
              </View>
              <View style={styles.detailRow}><MaterialIcons name="schedule" size={20} color="#bbb" style={styles.icon} /><Text style={styles.detailLabel}>Отправка:</Text><Text style={styles.detailValue}>{formatDateTimeForDisplay(delivery.departure_time)}</Text></View>
              <View style={styles.detailRow}><MaterialIcons name="schedule" size={20} color="#bbb" style={styles.icon} /><Text style={styles.detailLabel}>Доставка:</Text><Text style={styles.detailValue}>{formatDateTimeForDisplay(delivery.delivery_time)}</Text></View>
              <View style={styles.detailRow}><MaterialIcons name="map" size={20} color="#bbb" style={styles.icon} /><Text style={styles.detailLabel}>Дистанция:</Text><Text style={styles.detailValue}>{delivery.distance ? `${delivery.distance} км` : 'Не указано'}</Text></View>
              <View style={styles.detailRow}>
                  <MaterialIcons name="build" size={20} color="#bbb" style={styles.icon} />
                  <Text style={styles.detailLabel}>Услуги:</Text>
                  <Text style={styles.detailValue}>
                      {delivery.services?.map(serviceId => services.find(s => s.id === serviceId)?.name || `ID:${serviceId}`).join(', ') || 'Не указано'}
                  </Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialIcons name="flag" size={20} color="#bbb" style={styles.icon} />
                <Text style={styles.detailLabel}>Статус:</Text>
                {(() => {
                  const statusObject = statuses.find(s => s.id === delivery.status);
                  if (!statusObject) return <Text style={styles.detailValue}>Не указано</Text>;
                  
                  const defaultChipBg = styles.chipItem?.backgroundColor || '#232428'; 
                  const defaultChipTextSize = styles.chipText?.fontSize || 13;
                  const detailValueFontSize = styles.detailValue?.fontSize || 14;

                  const { backgroundColor: statusBgColor, textColor: statusTextColor } = getValidChipColors(statusObject.color, defaultChipBg);
                  
                  return (
                    <Chip
                      style={[styles.chip, { backgroundColor: statusBgColor, marginRight: 0 }]}
                      textStyle={{ color: statusTextColor, fontSize: detailValueFontSize < defaultChipTextSize ? detailValueFontSize : defaultChipTextSize }}
                    >
                      {statusObject.name}
                    </Chip>
                  );
                })()}
              </View>
              <View style={styles.detailRow}>
                  <MaterialIcons name="inventory" size={20} color="#bbb" style={styles.icon} />
                  <Text style={styles.detailLabel}>Упаковка:</Text>
                  <Text style={styles.detailValue}>{packagings.find(p => p.id === delivery.packaging)?.name || 'Не указано'}</Text>
              </View>
              <View style={styles.detailRow}><MaterialIcons name="person" size={20} color="#bbb" style={styles.icon} /><Text style={styles.detailLabel}>ФИО сборщика:</Text><Text style={styles.detailValue}>{delivery.fio || 'Не указано'}</Text></View>
              <View style={styles.detailRow}><MaterialIcons name="comment" size={20} color="#bbb" style={styles.icon} /><Text style={styles.detailLabel}>Комментарий:</Text><Text style={[styles.detailValue, { flexShrink: 1 }]}>{delivery.comment || 'Нет'}</Text></View>
              <View style={styles.detailRow}>
                  <MaterialIcons name="settings" size={20} color="#bbb" style={styles.icon} />
                  <Text style={styles.detailLabel}>Тех. исправность:</Text>
                  <Chip 
                    style={[styles.chip, { backgroundColor: delivery.technical_state ? techStates[0].color : techStates[1].color }]} 
                    textStyle={styles.chipText}
                  >
                      {delivery.technical_state ? techStates[0].label : techStates[1].label}
                  </Chip>
              </View>
            </View>
            {fileDetails.length > 0 && (
                 <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Прикрепленные файлы</Text>
                    {fileDetails.map(f => {
                      const fullFileUrl = f.file;
                      const fileName = fullFileUrl?.split('/').pop() || `file_${f.id}`;
                      const handleDownloadFile = async () => {
                        if (!fullFileUrl || typeof fullFileUrl !== 'string') {
                             Alert.alert("Ошибка", "Неверный URL файла.");
                             return;
                        }
                        
                        const localUri = FileSystem.documentDirectory + fileName;
                        console.log(`Downloading to persistent app storage: ${localUri}`);
                        Alert.alert("Загрузка", `Начинается загрузка файла: ${fileName}`);

                        try {
                          const { uri: downloadedUri } = await FileSystem.downloadAsync(fullFileUrl, localUri);
                          console.log('Finished downloading to :', downloadedUri);
                          
                          Alert.alert(
                            "Успешно", 
                            `Файл ${fileName} загружен.\n\nИспользуйте "Поделиться", чтобы сохранить или отправить файл.`,
                            [
                                { text: "OK" },
                                {
                                    text: "Поделиться",
                                    onPress: () => Share.share({ url: downloadedUri, title: fileName })
                                }
                            ]
                           );

                        } catch (error) {
                          console.error("Download error:", error);
                          Alert.alert("Ошибка загрузки", `Не удалось загрузить файл: ${fileName}.`);
                        }
                      };

                      return (
                        <View key={f.id} style={styles.fileRowContainer}> 
                            <TouchableOpacity onPress={handleDownloadFile} style={styles.fileRowTouchable}> 
                                <View style={styles.detailRow}> 
                                    <MaterialIcons name="attach-file" size={20} color="#bbb" style={styles.icon} />
                                    <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode='middle'>{fileName}</Text> 
                                    <MaterialIcons name="file-download" size={20} color="#bbb" style={{ marginLeft: 'auto' }} /> 
                                </View>
                            </TouchableOpacity>
                            {!isEditing && (
                                <> 
                                    <IconButton
                                        icon="delete-outline"
                                        size={20}
                                        iconColor="#ff6b6b"
                                        onPress={() => handleDeleteFile(f.id)}
                                        disabled={deletingFileId === f.id}
                                        style={styles.deleteFileButton}
                                    />
                                    {deletingFileId === f.id && <ActivityIndicator size="small" color="#ff6b6b" style={styles.deleteFileSpinner}/>} 
                                </> 
                            )}
                        </View>
                      )
                    })}
                 </View>
            )}
          </>
        )}

        {isDeleting && error && (
          <HelperText type="error" visible={!!error} style={styles.errorTextHelper}>
            {error}
          </HelperText>
        )}
      </ScrollView>
      
      {!isEditing && (
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleDelete}
            style={styles.deleteButton}
            textColor="#fff"
            icon="delete"
            disabled={isDeleting || isLoading}
            loading={isDeleting}
          >
            {isDeleting ? 'Удаление...' : 'Удалить доставку'}
          </Button>
        </View>
      )}

      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modalContainer}>
          {renderModalContent()}
        </Modal>
      </Portal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#232428' },
  header: { backgroundColor: '#232428' },
  content: { flex: 1 },
  footer: { padding: 16, backgroundColor: '#232428', borderTopWidth: 1, borderTopColor: '#333' },
  deleteButton: { backgroundColor: '#a31313' },
  button: { marginTop: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { color: '#fff', marginTop: 10 },
  errorText: { color: '#ff6b6b', textAlign: 'center', padding: 20, fontSize: 16 },
  errorTextHelper: { textAlign: 'center', marginTop: 10, fontSize: 14 },
  sectionContainer: { marginHorizontal: 16, marginVertical: 12, padding: 16, backgroundColor: '#303136', borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  icon: { marginRight: 12 },
  detailLabel: { fontSize: 14, color: '#bbb', marginRight: 8 },
  detailValue: { fontSize: 14, color: '#fff', flex: 1 },
  sectionHeader: { color: '#888', fontSize: 13, marginLeft: 16, marginTop: 16, marginBottom: 4, letterSpacing: 1 },
  formField: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#232428', borderBottomWidth: 1, borderBottomColor: '#444' },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fieldTitle: { color: '#888', fontSize: 13, marginRight: 16 },
  fieldValueText: { color: '#fff', fontSize: 13, flex: 1, textAlign: 'right' },
  modalContainer: { backgroundColor: '#232428', margin: 20, borderRadius: 8, padding: 20 },
  modalContent: { gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  modalLabel: { fontSize: 16, color: '#888', marginBottom: 8 },
  modalInput: { backgroundColor: 'transparent' },
  modalBtn: { marginTop: 16, backgroundColor: '#666' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chipContainerColumn: { flexDirection: 'column', gap: 10, marginBottom: 16, alignItems: 'stretch' },
  chipItem: { backgroundColor: '#232428', borderColor: '#555', borderWidth: 1 },
  chip: { height: 28, justifyContent: 'center', paddingHorizontal: 8, marginRight: 5 },
  chipText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  dateTimeContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dateTimeButton: { flex: 1, backgroundColor: '#444', padding: 12, borderRadius: 8, alignItems: 'center' },
  dateTimeButtonText: { color: '#fff', fontSize: 16 },
  fileRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileRowTouchable: {
      flex: 1,
      marginRight: 4,
  },
  deleteFileButton: {
      marginLeft: 'auto',
      margin: 0,
      padding: 0,
      height: 30,
      width: 30,
  },
  deleteFileSpinner: {
      marginLeft: 8,
      height: 30,
      width: 30,
  }
}); 
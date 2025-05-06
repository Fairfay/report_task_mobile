import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Appbar, Button, List, Text, TextInput, Chip, Portal, Modal, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { api } from '@/services/api'
import { useAuth } from '../hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileResponse } from '@/services/api';
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

const techStates = [
  { label: 'Исправно', value: true, color: '#176c3a' },
  { label: 'Неисправно', value: false, color: '#a31313' },
];

export default function CreateDeliveryScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  
  // Состояния для данных из API
  const [transports, setTransports] = useState<Transport[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Основные состояния
  const [model, setModel] = useState<Transport | null>(null);
  const [number, setNumber] = useState('');
  const [duration, setDuration] = useState('0:00');
  const [distance, setDistance] = useState('');
  const [media, setMedia] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [techState, setTechState] = useState<boolean>(true);
  const [fio, setFio] = useState('');
  const [comment, setComment] = useState('');
  const [packaging, setPackaging] = useState<Packaging | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileResponse[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<
    'model' | 'time' | 'distance' | 'service' | 'status' | 'techState' | 'fio' | 'comment' | 'packaging' | null
  >(null);


  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState<Date | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(null);
  const [showDepartureDatePicker, setShowDepartureDatePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [showDeliveryTimePicker, setShowDeliveryTimePicker] = useState(false);

  useEffect(() => {
    loadSavedFormData();
  }, []);
// Загрузка сохраненных данных после неудачной попытки создать доставку
  const loadSavedFormData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('deliveryFormData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setModel(parsedData.model || null);
        setNumber(parsedData.number || '');
        setDepartureDate(parsedData.departureDate ? new Date(parsedData.departureDate) : null);
        setDepartureTime(parsedData.departureTime ? new Date(parsedData.departureTime) : null);
        setDeliveryDate(parsedData.deliveryDate ? new Date(parsedData.deliveryDate) : null);
        setDeliveryTime(parsedData.deliveryTime ? new Date(parsedData.deliveryTime) : null);
        setDistance(parsedData.distance || '');
        setStatus(parsedData.status || null);
        setTechState(parsedData.techState !== undefined && parsedData.techState !== null ? parsedData.techState : true);
        setFio(parsedData.fio || '');
        setComment(parsedData.comment || '');
        setSelectedServices(parsedData.selectedServices || []);
        setPackaging(parsedData.packaging || null);
        if (parsedData.media) {
          setMedia(parsedData.media);
        }
        if (parsedData.uploadedFiles) {
          setUploadedFiles(parsedData.uploadedFiles);
        }
      }
    } catch (error) {
      console.error('Error loading saved form data:', error);
    }
  };
// Сохранение данных формы
  const saveFormData = async () => {
    try {
      const formData = {
        model,
        number,
        departureDate,
        departureTime,
        deliveryDate,
        deliveryTime,
        distance,
        status,
        techState,
        fio,
        comment,
        selectedServices,
        media,
        packaging: packaging?.id,
        uploadedFiles: uploadedFiles.map(f => f.id)
      };
      await AsyncStorage.setItem('deliveryFormData', JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  const clearSavedFormData = async () => {
    try {
      await AsyncStorage.removeItem('deliveryFormData');
    } catch (error) {
      console.error('Error clearing saved form data:', error);
    }
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [transportsData, servicesData, statusesData, packagingsData] = await Promise.all([
          api.getTransports(logout),
          api.getServices(logout),
          api.getStatuses(logout),
          api.getPackagings(logout)
        ]);

        
        if (transportsData && 'results' in transportsData) {
          setTransports((transportsData as PaginatedResponse<Transport>).results);
        } else {
          console.error('Invalid transports data:', transportsData);
          setError('Ошибка загрузки транспорта');
        }

        if (servicesData && 'results' in servicesData) {
          setServices((servicesData as PaginatedResponse<Service>).results);
        } else {
          console.error('Invalid services data:', servicesData);
          setError('Ошибка загрузки услуг');
        }

        if (statusesData && 'results' in statusesData) {
          const statusResults = (statusesData as PaginatedResponse<Status>).results;
          setStatuses(statusResults);
          if (statusResults.length > 0) {
            setStatus(statusResults[0]);
          }
        } else {
          console.error('Invalid statuses data:', statusesData);
          setError('Ошибка загрузки статусов');
        }

        if (packagingsData && 'results' in packagingsData) {
          setPackagings((packagingsData as PaginatedResponse<Packaging>).results);
        } else {
          console.error('Invalid packagings data:', packagingsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Произошла ошибка при загрузке данных');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Открытие/закрытие модального окна
  const openModal = (type: string) => {
    setModalType(type as 'model' | 'time' | 'distance' | 'service' | 'status' | 'techState' | 'fio' | 'comment' | 'packaging' | null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalType(null);
  };

  // Медиафайл - Обновляем для загрузки на сервер
  const pickMedia = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: false
        });

        if (result.canceled) {
            return;
        }

        if (result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            
            const maxSize = 10 * 1024 * 1024; 
            if (asset.size && asset.size > maxSize) {
                Alert.alert("Ошибка", "Файл слишком большой (макс. 10МБ)");
                return;
            }

            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                name: asset.name,
                type: asset.mimeType || 'application/octet-stream'
            } as any);

            setIsUploading(true);
            setError(null);
            console.log("Uploading file...");

            try {
                const response = await api.uploadFile(formData, logout);
                console.log("Upload successful:", response);
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

// Очистка медиа
  const clearMedia = () => {
      setUploadedFiles([]);
  };

// Создание доставки
  const handleCreate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const formatDateTime = (date: Date, time: Date) => {
        const combinedDate = new Date(date);
        combinedDate.setHours(time.getHours());
        combinedDate.setMinutes(time.getMinutes());
        return combinedDate.toISOString();
      };

      await api.createDelivery({
        transport: model?.id,
        number: number?.trim(),
        departure_time: departureDate && departureTime ? formatDateTime(departureDate, departureTime) : undefined,
        delivery_time: deliveryDate && deliveryTime ? formatDateTime(deliveryDate, deliveryTime) : undefined,
        distance: distance?.trim(),
        services: selectedServices.map(s => s.id),
        status: status?.id,
        technical_state: techState ?? false,
        fio: fio ? fio.trim() : undefined,
        comment: comment ? comment.trim() : undefined,
        packaging: packaging?.id,
        file: uploadedFiles.map(f => f.id)
      }, logout);

      await clearSavedFormData();
      router.back();
    } catch (error) {
      console.error('Error creating delivery:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при создании доставки');
      await saveFormData();
    } finally {
      setIsLoading(false);
    }
  };

  // Форматирование даты и времени для отображения
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    try {
      return date.toLocaleDateString('ru-RU');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    try {
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  // Модальное окно для выбора времени
  const renderTimeModalContent = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Отправка и доставка</Text>
      
      <Text style={styles.modalLabel}>ОТПРАВКА</Text>
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity 
          style={styles.dateTimeButton} 
          onPress={() => setShowDepartureDatePicker(true)}
        >
          <Text style={styles.dateTimeButtonText}>
            {departureDate ? formatDate(departureDate) : 'Выберите дату'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dateTimeButton} 
          onPress={() => setShowDepartureTimePicker(true)}
        >
          <Text style={styles.dateTimeButtonText}>
            {departureTime ? formatTime(departureTime) : 'Выберите время'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.modalLabel}>ДОСТАВКА</Text>
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity 
          style={styles.dateTimeButton} 
          onPress={() => setShowDeliveryDatePicker(true)}
        >
          <Text style={styles.dateTimeButtonText}>
            {deliveryDate ? formatDate(deliveryDate) : 'Выберите дату'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.dateTimeButton} 
          onPress={() => setShowDeliveryTimePicker(true)}
        >
          <Text style={styles.dateTimeButtonText}>
            {deliveryTime ? formatTime(deliveryTime) : 'Выберите время'}
          </Text>
        </TouchableOpacity>
      </View>

      <Button 
        mode="contained" 
        onPress={closeModal} 
        style={[styles.modalBtn, { backgroundColor: '#666' }]}
        textColor="#fff"
      >
        Применить
      </Button>

      {showDepartureDatePicker && (
        <DateTimePicker
          value={departureDate || new Date()}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setShowDepartureDatePicker(false);
            if (selectedDate) {
              setDepartureDate(selectedDate);
            }
          }}
        />
      )}

      {showDepartureTimePicker && (
        <DateTimePicker
          value={departureTime || new Date()}
          mode="time"
          display="spinner"
          onChange={(event, selectedTime) => {
            setShowDepartureTimePicker(false);
            if (selectedTime) {
              setDepartureTime(selectedTime);
            }
          }}
          is24Hour={true}
        />
      )}

      {showDeliveryDatePicker && (
        <DateTimePicker
          value={deliveryDate || new Date()}
          mode="date"
          display="calendar"
          onChange={(event, selectedDate) => {
            setShowDeliveryDatePicker(false);
            if (selectedDate) {
              setDeliveryDate(selectedDate);
            }
          }}
        />
      )}

      {showDeliveryTimePicker && (
        <DateTimePicker
          value={deliveryTime || new Date()}
          mode="time"
          display="spinner"
          onChange={(event, selectedTime) => {
            setShowDeliveryTimePicker(false);
            if (selectedTime) {
              setDeliveryTime(selectedTime);
            }
          }}
          is24Hour={true}
        />
      )}
    </View>
  );

  // Модальное окно для выбора по типу по факту можно вынести в отдельный компонент
  const renderModalContent = () => {
    switch (modalType) {
      case 'model':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Модель и номер</Text>
            <Text style={styles.modalLabel}>Модель</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {transports.map(t => (
                <Chip
                  key={t.id}
                  selected={model?.id === t.id}
                  onPress={() => setModel(t)}
                  style={{ backgroundColor: model?.id === t.id ? '#444' : '#232428', marginRight: 8, marginBottom: 8 }}
                  textStyle={{ color: '#fff' }}
                >
                  {t.brand}
                </Chip>
              ))}
            </View>
            <TextInput
              label="Номер"
              value={number}
              onChangeText={setNumber}
              style={styles.modalInput}
              underlineColor="#444"
              textColor="#fff"
              keyboardType="default"
            />
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
      case 'fio':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ФИО сборщика</Text>
            <TextInput
              label="ФИО сборщика"
              value={fio}
              onChangeText={setFio}
              style={styles.modalInput}
              underlineColor="#444"
              textColor="#fff"
              placeholder="Введите ФИО сборщика"
              placeholderTextColor="#666"
              keyboardType="default"
              autoCapitalize="words"
            />
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
      case 'comment':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Комментарий</Text>
            <TextInput
              label="Комментарий"
              value={comment}
              onChangeText={setComment}
              style={styles.modalInput}
              underlineColor="#444"
              textColor="#fff"
              placeholder="Введите комментарий"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              keyboardType="default"
              autoCapitalize="sentences"
            />
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
      case 'time':
        return renderTimeModalContent();
      case 'distance':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Адреса и координаты</Text>
            <TextInput
              label="Дистанция"
              value={distance}
              onChangeText={setDistance}
              style={styles.modalInput}
              underlineColor="#444"
              textColor="#fff"
              keyboardType="numeric"
            />
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
      case 'service':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Услуга</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {services.map(s => (
                <Chip
                  key={s.id}
                  selected={selectedServices.some(selected => selected.id === s.id)}
                  onPress={() => {
                    if (selectedServices.some(selected => selected.id === s.id)) {
                      setSelectedServices(selectedServices.filter(item => item.id !== s.id));
                    } else {
                      setSelectedServices([...selectedServices, s]);
                    }
                  }}
                  style={{ backgroundColor: selectedServices.some(selected => selected.id === s.id) ? '#444' : '#232428', marginRight: 8, marginBottom: 8 }}
                  textStyle={{ color: '#fff' }}
                >
                  {s.name}
                </Chip>
              ))}
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
      case 'status':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Статус</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {statuses.map(sItem => {
                const isSelected = status?.id === sItem.id;
                const defaultBg = styles.chip?.backgroundColor || '#232428';
                const defaultText = styles.chipText?.color || '#fff';

                const { backgroundColor: chipBg, textColor: chipText } = getValidChipColors(sItem.color, defaultBg, defaultText);
                
                return (
                  <Chip
                    key={sItem.id}
                    selected={isSelected}
                    onPress={() => setStatus(sItem)}
                    style={[
                      styles.chip,
                      { 
                        backgroundColor: chipBg, 
                        borderColor: isSelected ? 'white' : 'transparent',
                        borderWidth: isSelected ? 1 : 0,
                      }
                    ]}
                    //тоже не нукжно
                    textStyle={[{ color: 'black' }, styles.chipText, isSelected && { fontWeight: 'bold' }]}
                  >
                    <Text style={{ color: 'black' }}>{sItem.name}</Text>
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
      case 'techState':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Тех. исправность</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {techStates.map(s => (
                <Chip
                  key={s.label}
                  selected={techState === s.value}
                  onPress={() => setTechState(s.value)}
                  style={{ backgroundColor: techState === s.value ? '#444' : '#232428' }}
                  textStyle={{ color: '#fff' }}
                >
                  {s.label}
                </Chip>
              ))}
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
      case 'packaging':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Упаковка</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {packagings.map(p => (
                <Chip
                  key={p.id}
                  selected={packaging?.id === p.id}
                  onPress={() => setPackaging(p)}
                  style={{ backgroundColor: packaging?.id === p.id ? '#444' : '#232428', marginRight: 8, marginBottom: 8 }}
                  textStyle={{ color: '#fff' }}
                >
                  {p.name}
                </Chip>
              ))}
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
      default:
        return null;
    }
  };

  // Определяет, является ли форма недействительной
  const isFormInvalid =
    !model ||
    !number.trim() ||
    !fio.trim() ||
    !departureDate ||
    !departureTime ||
    !deliveryDate ||
    !deliveryTime ||
    !status;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={{ color: '#fff' }}>Загрузка...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={{ color: '#fff' }}>{error}</Text>
        <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 16 }}>
          Назад
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Новая доставка" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <List.Section>
          <List.Subheader>Основная информация</List.Subheader>
          <List.Item
            title="Модель и номер"
            description={model ? `${model.brand} ${number}` : 'Не выбрано'}
            left={props => <MaterialIcons name="local-shipping" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('model')}
          />
          <List.Item
            title="Отправка и доставка"
            description={
              departureDate && departureTime && deliveryDate && deliveryTime
                ? `${formatDate(departureDate)} ${formatTime(departureTime)} - ${formatDate(deliveryDate)} ${formatTime(deliveryTime)}`
                : 'Не выбрано'
            }
            left={props => <MaterialIcons name="schedule" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('time')}
          />
          <List.Item
            title="Адреса и координаты"
            description={distance ? `Дистанция: ${distance} км` : 'Не выбрано'}
            left={props => <MaterialIcons name="map" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('distance')}
          />
          <List.Item
            title="Услуга"
            description={selectedServices.length ? selectedServices.map(s => s.name).join(', ') : 'Не выбрано'}
            left={props => <MaterialIcons name="build" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('service')}
          />
          <List.Item
            title="Статус"
            description={!status ? 'Не выбрано' : status.name}
            left={props => <MaterialIcons name="flag" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('status')}
            right={props => {
              if (!status) return <List.Icon {...props} icon="chevron-right" />;
              const { backgroundColor: currentStatusBg, textColor: currentStatusText } = getValidChipColors(status.color, styles.chip?.backgroundColor || '#232428');
              return (
                <Chip
                  style={[
                    styles.chip, 
                    { backgroundColor: currentStatusBg, alignSelf: 'center', marginRight: 0 }
                  ]}
                  textStyle={{ color: currentStatusText, fontSize: styles.chipText?.fontSize }}
                >
                  {status.name}
                </Chip>
              );
            }}
          />
          <List.Item
            title="Упаковка"
            description={packaging?.name || 'Не выбрано'}
            left={props => <MaterialIcons name="inventory" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('packaging')}
          />
          <List.Item
            title="ФИО сборщика"
            description={fio || 'Не указано'}
            left={props => <MaterialIcons name="person" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('fio')}
          />
          <List.Item
            title="Комментарий"
            description={comment || 'Не указано'}
            left={props => <MaterialIcons name="comment" size={24} color={props.color} style={{marginLeft: props.style?.marginLeft, marginRight: props.style?.marginRight}} />}
            onPress={() => openModal('comment')}
          />

          {/* Перемещенный медиафайл */}
          <List.Item
            title="Медиафайл"
            description={
                isUploading ? "Загрузка..." : 
                uploadedFiles.length > 0 ? uploadedFiles[0].file.split('/').pop() : 
                'Не выбрано'
            }
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

          {/* Перемещенный пикер технического состояния */}
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
      </ScrollView>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modalContainer}
        >
          {renderModalContent()}
        </Modal>
      </Portal>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleCreate}
          style={[
            styles.createButton,
            { backgroundColor: isFormInvalid ? '#444' : '#666' }, 
          ]}
          textColor="#fff"
          disabled={isFormInvalid}
        >
          Создать
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232428',
  },
  header: {
    backgroundColor: '#232428',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#232428',
  },
  createButton: {
    marginBottom: 8,
    backgroundColor: '#666',
  },
  modalContainer: {
    backgroundColor: '#232428',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalContent: {
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: 'transparent',
  },
  modalBtn: {
    marginTop: 16,
    backgroundColor: '#666',
  },
  section: {
    color: '#888',
    fontSize: 13,
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 4,
    letterSpacing: 1,
  },
  divider: {
    backgroundColor: '#333',
    marginBottom: 4,
  },
  itemDivider: {
    backgroundColor: '#e0e0e0',
    height: 1,
    marginHorizontal: 16,
    borderRadius: 1,
    opacity: 0.7,
  },
  chip: {
    marginRight: 8,
    height: 28,
    justifyContent: 'center',
    backgroundColor: '#176c3a',
  },
  chipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  formField: {
    padding: 16,
    backgroundColor: '#232428',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldTitle: {
    color: '#888',
    fontSize: 13,
    marginRight: 16,
  },
  fieldValueText: { 
    color: '#fff',
    fontSize: 13,
    flexShrink: 1,
    marginRight: 5,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateTimeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  pickerContainer: {
    padding: 16,
  },
  dateInput: {
    backgroundColor: '#232428',
  },
  timeInput: {
    backgroundColor: '#232428',
  },
  textInput: {
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
  },
}); 